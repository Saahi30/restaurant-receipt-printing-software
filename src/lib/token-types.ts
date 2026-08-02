export type TokenStatus = "preparing" | "ready" | "handed_over" | "cancelled";

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

export const TOKEN_SLA_MINUTES = 25;

export function formatTokenCountdown(remainingMs: number): string {
  const overdue = remainingMs < 0;
  const abs = Math.abs(remainingMs);
  const totalSec = Math.floor(abs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const clock = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return overdue ? `+${clock}` : clock;
}
