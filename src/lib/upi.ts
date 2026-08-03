/**
 * Builds a standard UPI deep-link (UPI Intent URI).
 * Format:  upi://pay?pa=<VPA>&pn=<Payee Name>&am=<Amount>&cu=INR&tn=<Note>
 *   pa  -> Payee VPA / UPI ID
 *   pn  -> Payee display name
 *   am  -> Amount, auto-set from the bill total (2 decimals)
 *   cu  -> Currency code (INR)
 *   tn  -> Transaction note (bill number + table)
 */
export function buildUpiLink(opts: {
  vpa: string;
  payeeName: string;
  amount: number;
  note?: string;
}): string {
  const params = new URLSearchParams();
  params.set("pa", opts.vpa.trim());
  params.set("pn", opts.payeeName);
  params.set("am", opts.amount.toFixed(2));
  params.set("cu", "INR");
  if (opts.note) params.set("tn", opts.note);
  return `upi://pay?${params.toString()}`;
}
