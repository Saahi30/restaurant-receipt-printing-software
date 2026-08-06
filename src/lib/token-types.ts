export type TokenStatus = "preparing" | "ready" | "handed_over" | "cancelled" | "draft";

export type TokenItem = {
  name: string;
  nameHi?: string;
  quantity: number;
  price: number;
};

export type TakeawayToken = {
  id: string;
  tokenNumber: number;
  tokenLabel: string;
  orderNumber: string | null;
  billId: string | null;
  customerName: string;
  paymentMethod: string;
  paymentCollected: boolean;
  status: TokenStatus;
  items: TokenItem[];
  totalAmount: number;
  currency: string;
  slaMinutes: number;
  createdAt: string;
  readyAt: string | null;
  handedOverAt: string | null;
  cancelledAt: string | null;
  createdBy: string | null;
  notes: string | null;
  remainingMs: number;
  overdue: boolean;
};

/** Kitchen pickup countdown shown in Admin (not the auto-close window). */
export const TOKEN_SLA_MINUTES = 25;

/** Active tokens older than this are auto-closed into status "draft". */
export const TOKEN_AUTO_CLOSE_MINUTES = 180;

export const TOKEN_AUTO_CLOSE_NOTE = "Auto-closed after 180 minutes wait";

export function formatTokenCountdown(remainingMs: number): string {
  const overdue = remainingMs < 0;
  const abs = Math.abs(remainingMs);
  const totalSec = Math.floor(abs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const clock = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return overdue ? `+${clock}` : clock;
}
