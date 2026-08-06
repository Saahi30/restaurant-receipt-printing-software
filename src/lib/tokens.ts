import { getSupabase } from "@/lib/supabase";
import {
  TOKEN_AUTO_CLOSE_MINUTES,
  TOKEN_AUTO_CLOSE_NOTE,
  TOKEN_SLA_MINUTES,
  type TakeawayToken,
  type TokenItem,
  type TokenStatus,
} from "@/lib/token-types";

export type { TakeawayToken, TokenItem, TokenStatus };
export {
  TOKEN_SLA_MINUTES,
  TOKEN_AUTO_CLOSE_MINUTES,
  formatTokenCountdown,
} from "@/lib/token-types";

const ACTIVE: TokenStatus[] = ["preparing", "ready"];

function rowToToken(row: any): TakeawayToken {
  const createdAt = row.created_at;
  const slaMinutes = Number(row.sla_minutes ?? TOKEN_SLA_MINUTES);
  const deadline = new Date(createdAt).getTime() + slaMinutes * 60_000;
  const remainingMs = deadline - Date.now();
  return {
    id: row.id,
    tokenNumber: Number(row.token_number),
    tokenLabel: row.token_label,
    orderNumber: row.order_number ?? null,
    billId: row.bill_id ?? null,
    customerName: row.customer_name || "",
    paymentMethod: row.payment_method || "Cash",
    paymentCollected: row.payment_collected !== false,
    status: row.status,
    items: Array.isArray(row.items) ? row.items : [],
    totalAmount: Number(row.total_amount ?? 0),
    currency: row.currency || "₹",
    slaMinutes,
    createdAt,
    readyAt: row.ready_at ?? null,
    handedOverAt: row.handed_over_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    createdBy: row.created_by ?? null,
    notes: row.notes ?? null,
    remainingMs,
    overdue: remainingMs < 0 && ACTIVE.includes(row.status),
  };
}

/** Calendar day in Asia/Kolkata for daily token reset. */
export function todayIstDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Move preparing/ready tokens older than TOKEN_AUTO_CLOSE_MINUTES into status "draft".
 * Runs opportunistically whenever tokens are listed (Admin polls every 5s).
 */
export async function expireStaleTokensToDraft(): Promise<number> {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - TOKEN_AUTO_CLOSE_MINUTES * 60_000).toISOString();

  const { data, error } = await supabase
    .from("takeaway_tokens")
    .update({
      status: "draft",
      notes: TOKEN_AUTO_CLOSE_NOTE,
      cancelled_at: new Date().toISOString(),
    })
    .in("status", ACTIVE)
    .lt("created_at", cutoff)
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

export async function listTokens(opts?: {
  activeOnly?: boolean;
  draftOnly?: boolean;
}): Promise<TakeawayToken[]> {
  // Always sweep stale actives into draft before returning lists.
  await expireStaleTokensToDraft();

  const supabase = getSupabase();
  let q = supabase.from("takeaway_tokens").select("*").order("created_at", { ascending: false });

  if (opts?.draftOnly) {
    q = q.eq("status", "draft");
  } else if (opts?.activeOnly) {
    q = q.in("status", ACTIVE);
  } else {
    // Today + still-active from earlier (safety)
    const dayStart = `${todayIstDate()}T00:00:00+05:30`;
    q = q.or(`created_at.gte.${dayStart},status.in.(${ACTIVE.join(",")})`);
  }

  const { data, error } = await q.limit(200);
  if (error) throw error;
  return (data || []).map(rowToToken);
}

export async function createToken(input: {
  orderNumber?: string;
  billId?: string;
  customerName?: string;
  paymentMethod?: string;
  paymentCollected?: boolean;
  items?: TokenItem[];
  totalAmount?: number;
  currency?: string;
  slaMinutes?: number;
  createdBy?: string;
  notes?: string;
}): Promise<TakeawayToken> {
  const supabase = getSupabase();
  const day = todayIstDate();

  const { data: num, error: numError } = await supabase.rpc("next_takeaway_token_number", {
    p_day: day,
  });
  if (numError) throw numError;

  const tokenNumber = Number(num);
  const tokenLabel = `T-${String(tokenNumber).padStart(2, "0")}`;
  const id = `tok_${Date.now()}_${tokenNumber}`;

  const row = {
    id,
    token_number: tokenNumber,
    token_label: tokenLabel,
    order_number: input.orderNumber ?? null,
    bill_id: input.billId ?? null,
    customer_name: input.customerName ?? "",
    payment_method: input.paymentMethod ?? "Cash",
    payment_collected: input.paymentCollected !== false,
    status: "preparing",
    items: input.items ?? [],
    total_amount: input.totalAmount ?? 0,
    currency: input.currency ?? "₹",
    sla_minutes: input.slaMinutes ?? TOKEN_SLA_MINUTES,
    created_by: input.createdBy ?? null,
    notes: input.notes ?? null,
  };

  const { data, error } = await supabase.from("takeaway_tokens").insert(row).select("*").single();
  if (error) throw error;
  return rowToToken(data);
}

export async function updateToken(
  id: string,
  update: {
    status?: TokenStatus;
    paymentCollected?: boolean;
    paymentMethod?: string;
    notes?: string;
  }
): Promise<TakeawayToken | null> {
  const supabase = getSupabase();
  const { data: existing, error: findError } = await supabase
    .from("takeaway_tokens")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (findError) throw findError;
  if (!existing) return null;

  const patch: Record<string, unknown> = {};
  if (update.paymentCollected !== undefined) patch.payment_collected = update.paymentCollected;
  if (update.paymentMethod !== undefined) patch.payment_method = update.paymentMethod;
  if (update.notes !== undefined) patch.notes = update.notes;

  if (update.status) {
    patch.status = update.status;
    if (update.status === "ready") patch.ready_at = new Date().toISOString();
    if (update.status === "handed_over") {
      patch.handed_over_at = new Date().toISOString();
      // Handover implies payment settled at counter
      if (update.paymentCollected !== false) patch.payment_collected = true;
    }
    if (update.status === "cancelled" || update.status === "draft") {
      patch.cancelled_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("takeaway_tokens")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToToken(data);
}
