/** ASCII-safe receipt labels for thermal ESC/POS (no Devanagari). */
export type ReceiptLang = "en" | "hi";

const EN = {
  billNo: "Bill No",
  date: "Date",
  table: "Table",
  type: "Type",
  customer: "Customer",
  item: "Item",
  qtyRate: "Qty x Rate",
  total: "Total",
  subtotal: "Subtotal",
  discount: "Discount",
  serviceCharge: "Service Charge",
  taxGst: "Tax / GST",
  totalAmount: "TOTAL AMOUNT",
  paymentMode: "Payment Mode",
  payViaUpi: "PAY VIA UPI (Scan QR on counter)",
  upiId: "UPI ID",
  amountAuto: "Amount auto-set to bill total",
  freeWifi: "Free WiFi",
  pwd: "Pwd",
  tel: "Tel",
  dineIn: "Dine-In",
  takeaway: "Takeaway",
  kotTitle: "KITCHEN ORDER (KOT)",
  order: "Order",
  time: "Time",
  itemName: "ITEM NAME",
  qty: "QTY",
  note: "NOTE",
  endKot: "*** END OF KOT ***",
  none: "None",
} as const;

/** Romanized Hindi — thermal printers cannot print Devanagari. */
const HI_PRINT = {
  billNo: "Bill No",
  date: "Tarikh",
  table: "Table",
  type: "Prakar",
  customer: "Grahak",
  item: "Item",
  qtyRate: "Matra x Rate",
  total: "Kul",
  subtotal: "Up-yog",
  discount: "Chhoot",
  serviceCharge: "Service Charge",
  taxGst: "Tax / GST",
  totalAmount: "KUL YOG",
  paymentMode: "Bhugtan",
  payViaUpi: "UPI SE PAY (QR scan karein)",
  upiId: "UPI ID",
  amountAuto: "Amount bill total par set",
  freeWifi: "Free WiFi",
  pwd: "Pwd",
  tel: "Phone",
  dineIn: "Dine-In",
  takeaway: "Takeaway",
  kotTitle: "KITCHEN ORDER (KOT)",
  order: "Order",
  time: "Samay",
  itemName: "ITEM NAME",
  qty: "QTY",
  note: "NOTE",
  endKot: "*** END OF KOT ***",
  none: "None",
} as const;

export type ReceiptLabelKey = keyof typeof EN;

export function receiptLabel(key: ReceiptLabelKey, lang: ReceiptLang = "en"): string {
  return (lang === "hi" ? HI_PRINT : EN)[key];
}

export function translateOrderType(orderType: string, lang: ReceiptLang): string {
  const normalized = orderType.toLowerCase();
  if (normalized.includes("take") || normalized.includes("parcel")) {
    return receiptLabel("takeaway", lang);
  }
  if (normalized.includes("dine")) {
    return receiptLabel("dineIn", lang);
  }
  return orderType;
}

export function translatePaymentMethod(method: string, lang: ReceiptLang): string {
  const m = method.toLowerCase();
  if (lang !== "hi") return method;
  if (m === "cash") return "Nakad";
  if (m === "udhaar") return "Udhaar";
  return method;
}
