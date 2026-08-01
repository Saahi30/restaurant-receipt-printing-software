import { getSupabase } from "@/lib/supabase";

export type SessionStatus = "empty" | "ongoing" | "ready";

export type SessionItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type TableSession = {
  tableId: string;
  status: SessionStatus;
  items: SessionItem[];
  customerName: string;
  paymentMethod: string;
  orderType: string;
  receipt: any | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type PrintStation = {
  online: boolean;
  printerConnected: boolean;
  lastSeen: string | null;
  isReady: boolean;
};

const STATION_ONLINE_MS = 20_000;

function rowToSession(row: any): TableSession {
  return {
    tableId: row.table_id,
    status: row.status,
    items: Array.isArray(row.items) ? row.items : [],
    customerName: row.customer_name || "",
    paymentMethod: row.payment_method || "Cash",
    orderType: row.order_type || "Dine-In",
    receipt: row.receipt ?? null,
    updatedBy: row.updated_by ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function deriveStatus(items: SessionItem[], forceReady = false): SessionStatus {
  if (forceReady && items.length > 0) return "ready";
  if (!items || items.length === 0) return "empty";
  return "ongoing";
}

export async function listSessions(): Promise<TableSession[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("table_sessions").select("*");
  if (error) throw error;
  return (data || []).map(rowToSession);
}

export async function getSession(tableId: string): Promise<TableSession | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("table_sessions")
    .select("*")
    .eq("table_id", tableId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToSession(data) : null;
}

export async function upsertSession(input: {
  tableId: string;
  items: SessionItem[];
  customerName?: string;
  paymentMethod?: string;
  orderType?: string;
  status?: SessionStatus;
  receipt?: any | null;
  updatedBy?: string | null;
}): Promise<TableSession> {
  const items = input.items || [];
  const status = input.status ?? deriveStatus(items);
  const supabase = getSupabase();
  const row = {
    table_id: input.tableId,
    status,
    items,
    customer_name: input.customerName ?? "",
    payment_method: input.paymentMethod ?? "Cash",
    order_type: input.orderType ?? "Dine-In",
    receipt: status === "ready" ? input.receipt ?? null : input.receipt === undefined ? undefined : input.receipt,
    updated_by: input.updatedBy ?? null,
    updated_at: new Date().toISOString(),
  };

  // Clear receipt when not ready unless explicitly provided
  const payload: Record<string, any> = { ...row };
  if (status !== "ready" && input.receipt === undefined) {
    payload.receipt = null;
  }

  const { data, error } = await supabase
    .from("table_sessions")
    .upsert(payload, { onConflict: "table_id" })
    .select("*")
    .single();
  if (error) throw error;
  return rowToSession(data);
}

export async function clearSession(tableId: string, updatedBy?: string): Promise<TableSession> {
  return upsertSession({
    tableId,
    items: [],
    customerName: "",
    paymentMethod: "Cash",
    status: "empty",
    receipt: null,
    updatedBy: updatedBy ?? null,
  });
}

export async function markReady(input: {
  tableId: string;
  receipt: any;
  items: SessionItem[];
  customerName?: string;
  paymentMethod?: string;
  orderType?: string;
  updatedBy?: string;
}): Promise<TableSession> {
  const session = await upsertSession({
    tableId: input.tableId,
    items: input.items,
    customerName: input.customerName,
    paymentMethod: input.paymentMethod,
    orderType: input.orderType,
    status: "ready",
    receipt: input.receipt,
    updatedBy: input.updatedBy,
  });

  // Trigger laptop print instantly via Realtime print_jobs queue
  await enqueuePrintJob({
    tableId: input.tableId,
    receipt: input.receipt,
  });

  return session;
}

export async function enqueuePrintJob(input: { tableId: string; receipt: any }) {
  const supabase = getSupabase();
  const id = `pj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.from("print_jobs").insert({
    id,
    table_id: input.tableId,
    receipt: input.receipt,
    status: "pending",
  });
  if (error) throw error;
  return id;
}

export async function claimPrintJob(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("print_jobs")
    .update({ status: "printing" })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function completePrintJob(id: string, failed?: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("print_jobs")
    .update(
      failed
        ? { status: "failed", error: failed, printed_at: new Date().toISOString() }
        : { status: "done", error: null, printed_at: new Date().toISOString() }
    )
    .eq("id", id);
  if (error) throw error;
}

export async function listPendingPrintJobs() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("print_jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

function stationIsReady(row: { online: boolean; printer_connected: boolean; last_seen: string | null }): boolean {
  if (!row.online || !row.printer_connected || !row.last_seen) return false;
  const age = Date.now() - new Date(row.last_seen).getTime();
  return age <= STATION_ONLINE_MS;
}

export async function getPrintStation(): Promise<PrintStation> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("print_station").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  const row = data || { online: false, printer_connected: false, last_seen: null };
  return {
    online: !!row.online,
    printerConnected: !!row.printer_connected,
    lastSeen: row.last_seen,
    isReady: stationIsReady(row),
  };
}

export async function heartbeatPrintStation(input: {
  online: boolean;
  printerConnected: boolean;
}): Promise<PrintStation> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("print_station")
    .upsert({
      id: 1,
      online: input.online,
      printer_connected: input.printerConnected,
      last_seen: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return {
    online: !!data.online,
    printerConnected: !!data.printer_connected,
    lastSeen: data.last_seen,
    isReady: stationIsReady(data),
  };
}

export async function requireStationReady(): Promise<PrintStation> {
  const station = await getPrintStation();
  if (!station.isReady) {
    const err: any = new Error("Connect laptop");
    err.code = "STATION_OFFLINE";
    throw err;
  }
  return station;
}
