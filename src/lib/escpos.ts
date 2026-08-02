// ESC/POS Thermal Printer Command Generator

import {
  receiptLabel,
  translateOrderType,
  translatePaymentMethod,
  type ReceiptLang,
} from "@/lib/receipt-labels";

export interface ReceiptData {
  restaurantName: string;
  tagline?: string;
  address?: string;
  phone?: string;
  gstNumber?: string;
  currency: string;
  orderNumber: string;
  tableNumber: string;
  orderType: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    notes?: string;
  }>;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  serviceCharge: number;
  serviceChargeRate: number;
  discountAmount: number;
  discountReason?: string;
  totalAmount: number;
  paymentMethod: string;
  /** Takeaway queue token label e.g. T-12 */
  tokenNumber?: string;
  /** false = collect payment at pickup */
  paymentCollected?: boolean;
  footerText?: string;
  aboutUs?: string;
  upiId?: string;
  wifiSSID?: string;
  wifiPassword?: string;
  paperWidth: "80mm" | "58mm"; // 80mm = ~48 chars per line, 58mm = ~32 chars per line
  cutPaper?: boolean;
  openDrawer?: boolean;
  /** Ignored for thermal print — ESC/POS receipts are always English. */
  lang?: ReceiptLang;
}

export class EscPosBuilder {
  private buffer: number[] = [];
  private maxChars: number;

  constructor(paperWidth: "80mm" | "58mm" = "80mm") {
    this.maxChars = paperWidth === "58mm" ? 32 : 48;
    this.init();
    this.density();
    this.leftMargin(0);
  }

  // ESC @ - Initialize printer
  init(): this {
    this.buffer.push(0x1B, 0x40);
    return this;
  }

  /**
   * Darker thermal print (ESC 7 — common on Xprinter / Rongta / clones).
   * n1 = max heating dots, n2 = heating time, n3 = heating interval.
   */
  density(): this {
    this.buffer.push(0x1B, 0x37, 0x07, 0xA0, 0x02);
    return this;
  }

  /** GS L — set left margin in dots (0 = edge-to-edge). */
  leftMargin(dots: number = 0): this {
    const n = Math.max(0, Math.min(dots, 65535));
    this.buffer.push(0x1D, 0x4C, n & 0xff, (n >> 8) & 0xff);
    return this;
  }

  // ESC a - Alignment (0: Left, 1: Center, 2: Right)
  align(align: "left" | "center" | "right"): this {
    const val = align === "left" ? 0 : align === "center" ? 1 : 2;
    this.buffer.push(0x1B, 0x61, val);
    return this;
  }

  // ESC E - Bold font (1: On, 0: Off)
  bold(on: boolean): this {
    this.buffer.push(0x1B, 0x45, on ? 1 : 0);
    return this;
  }

  // GS ! - Select character size (0x11: Double width & height, 0x10: Double height, 0x01: Double width, 0x00: Normal)
  size(mode: "normal" | "double" | "double-width" | "double-height"): this {
    let val = 0x00;
    if (mode === "double") val = 0x11;
    if (mode === "double-width") val = 0x01;
    if (mode === "double-height") val = 0x10;
    this.buffer.push(0x1D, 0x21, val);
    return this;
  }

  text(str: string): this {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Basic ASCII and Latin-1 support for ESC/POS
      if (code <= 0xFF) {
        this.buffer.push(code);
      } else {
        this.buffer.push(0x3F); // '?' replacement for complex unicode in basic ASCII mode
      }
    }
    return this;
  }

  line(str: string = ""): this {
    this.text(str);
    this.buffer.push(0x0A); // LF (Line Feed)
    return this;
  }

  divider(char: string = "-"): this {
    this.line(char.repeat(this.maxChars));
    return this;
  }

  row(left: string, right: string): this {
    const available = this.maxChars - right.length;
    let l = left;
    if (l.length > available - 1) {
      l = l.substring(0, available - 4) + "...";
    }
    const spaces = Math.max(1, this.maxChars - l.length - right.length);
    this.line(l + " ".repeat(spaces) + right);
    return this;
  }

  row3(col1: string, col2: string, col3: string): this {
    // For 80mm: e.g. 24 chars left, 10 chars middle, 14 chars right
    // For 58mm: e.g. 14 chars left, 8 chars middle, 10 chars right
    const w1 = this.maxChars === 32 ? 14 : 24;
    const w2 = this.maxChars === 32 ? 8 : 10;
    const w3 = this.maxChars - w1 - w2;

    const c1 = col1.padEnd(w1, " ").substring(0, w1);
    const c2 = col2.padStart(w2, " ").substring(0, w2);
    const c3 = col3.padStart(w3, " ").substring(0, w3);
    this.line(c1 + c2 + c3);
    return this;
  }

  // Word-wrap a block of text (respects existing newlines) to the paper width
  wrap(str: string): this {
    const paragraphs = str.replace(/\r/g, "").split("\n");
    let blankStreak = 0;
    paragraphs.forEach((para) => {
      if (para.trim() === "") {
        // Avoid dumping long runs of blank lines onto thermal paper
        if (blankStreak < 1) {
          this.line("");
          blankStreak++;
        }
        return;
      }
      blankStreak = 0;
      const words = para.split(/\s+/);
      let current = "";
      words.forEach((word) => {
        if (current === "") {
          current = word;
        } else if ((current + " " + word).length <= this.maxChars) {
          current += " " + word;
        } else {
          this.line(current);
          current = word;
        }
      });
      if (current !== "") this.line(current);
    });
    return this;
  }

  /** Feed at most a few lines — large values make cheap printers spit blank paper. */
  feed(lines: number = 2): this {
    const n = Math.max(0, Math.min(Math.floor(lines) || 0, 5));
    if (n > 0) this.buffer.push(0x1B, 0x64, n);
    return this;
  }

  /**
   * Partial cut — use GS V 1 (no extra feed parameter).
   * GS V 65 n (feed-then-cut) makes many clone printers feed endlessly.
   */
  cut(): this {
    this.feed(2); // advance past the print head to the cutter
    this.buffer.push(0x1D, 0x56, 0x01); // GS V 1 — partial cut
    return this;
  }

  /** ESC @ — reset printer (stops runaway feed on most ESC/POS devices). */
  reset(): this {
    this.buffer.push(0x1B, 0x40);
    return this;
  }

  // ESC p - Cash Drawer Kick
  drawer(): this {
    this.buffer.push(0x1B, 0x70, 0x00, 0x19, 0xFA);
    return this;
  }

  getUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  getHexString(): string {
    return this.buffer.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
  }

  getBinaryString(): string {
    return String.fromCharCode(...this.buffer);
  }
}

export function generateEscPosReceipt(data: ReceiptData): {
  uint8Array: Uint8Array;
  hex: string;
} {
  const builder = new EscPosBuilder(data.paperWidth);
  // Thermal printers: English labels only (no Devanagari / romanized Hindi).
  const lang: ReceiptLang = "en";
  const L = (key: Parameters<typeof receiptLabel>[0]) => receiptLabel(key, lang);
  const orderType = translateOrderType(data.orderType, lang);
  const payment = translatePaymentMethod(data.paymentMethod, lang);

  if (data.openDrawer) {
    builder.drawer();
  }

  // Header — bold + double for darker name on thermal
  builder.align("center").size("double").bold(true).line(data.restaurantName);
  builder.size("normal").bold(true);
  
  if (data.tagline) builder.line(data.tagline);
  if (data.address) builder.line(data.address);
  if (data.phone) builder.line(`${L("tel")}: ${data.phone}`);
  if (data.gstNumber) builder.line(data.gstNumber);
  builder.bold(false);
  
  builder.divider("=");
  
  // Bill Info
  builder.align("left");
  builder.row(`${L("billNo")}: ` + data.orderNumber, `${L("date")}: ` + data.date.split(" ")[0]);
  builder.row(`${L("type")}: ` + orderType, `${L("table")}: ` + data.tableNumber);
  if (data.tokenNumber) {
    builder.align("center").size("double").bold(true).line(`${L("token")}: ${data.tokenNumber}`);
    builder.size("normal").bold(false).align("left");
    if (data.paymentCollected === false) {
      builder.align("center").bold(true).line(L("payAtPickup")).bold(false).align("left");
    }
  }
  if (data.customerName) {
    builder.row(`${L("customer")}: ` + data.customerName, data.customerPhone || "");
  }

  builder.divider("-");
  
  // Table Header
  builder.bold(true);
  builder.row3(L("item"), L("qtyRate"), `${L("total")} (${data.currency})`);
  builder.bold(false);
  builder.divider("-");

  // Items
  data.items.forEach((item) => {
    const lineTotal = item.total ?? item.price * item.quantity;
    const rateStr = `${item.quantity}x${item.price.toFixed(2)}`;
    const totalStr = lineTotal.toFixed(2);
    builder.row3(item.name, rateStr, totalStr);
    if (item.notes) {
      builder.line(`  * ${item.notes}`);
    }
  });

  builder.divider("-");

  // Totals
  builder.row(`${L("subtotal")}:`, `${data.currency}${data.subtotal.toFixed(2)}`);
  
  if (data.discountAmount > 0) {
    const reason = data.discountReason ? ` (${data.discountReason})` : "";
    builder.row(`${L("discount")}${reason}:`, `-${data.currency}${data.discountAmount.toFixed(2)}`);
  }

  if (data.serviceCharge > 0) {
    builder.row(`${L("serviceCharge")} (${data.serviceChargeRate}%):`, `${data.currency}${data.serviceCharge.toFixed(2)}`);
  }

  if (data.taxAmount > 0) {
    builder.row(`${L("taxGst")} (${data.taxRate}%):`, `${data.currency}${data.taxAmount.toFixed(2)}`);
  }

  builder.divider("=");
  
  builder.size("double-height").bold(true);
  builder.row(`${L("totalAmount")}:`, `${data.currency}${data.totalAmount.toFixed(2)}`);
  builder.size("normal").bold(false);
  
  builder.divider("=");
  builder.row(`${L("paymentMode")}:`, payment.toUpperCase());

  // UPI payment info (VPA only — amount auto-fills when customer scans the QR)
  if (data.upiId && data.upiId.trim() !== "") {
    builder.divider("-");
    builder.line(L("payViaUpi"));
    builder.line(`${L("upiId")}: ` + data.upiId.trim());
    builder.line(L("amountAuto"));
  }

  // Footer
  builder.feed(1).align("center");
  if (data.wifiSSID) {
    builder.line(`${L("freeWifi")}: ${data.wifiSSID} | ${L("pwd")}: ${data.wifiPassword || L("none")}`);
  }
  if (data.aboutUs && data.aboutUs.trim() !== "") {
    builder.divider("-");
    builder.wrap(data.aboutUs.trim());
  }

  if (data.footerText && data.footerText.trim() !== "") {
    builder.divider("-");
    builder.bold(true).wrap(data.footerText.trim()).bold(false);
  }

  if (data.cutPaper !== false) {
    builder.cut();
  } else {
    builder.feed(3);
  }

  return {
    uint8Array: builder.getUint8Array(),
    hex: builder.getHexString(),
  };
}

export function generateEscPosKOT(data: {
  restaurantName: string;
  orderNumber: string;
  tableNumber: string;
  orderType: string;
  date: string;
  items: Array<{ name: string; quantity: number; notes?: string }>;
  paperWidth: "80mm" | "58mm";
  lang?: ReceiptLang;
}): { uint8Array: Uint8Array; hex: string } {
  const builder = new EscPosBuilder(data.paperWidth);
  // Thermal printers: English labels only.
  const lang: ReceiptLang = "en";
  const L = (key: Parameters<typeof receiptLabel>[0]) => receiptLabel(key, lang);
  const orderType = translateOrderType(data.orderType, lang);

  builder
    .align("center")
    .size("double")
    .bold(true)
    .line(L("kotTitle"))
    .size("normal")
    .bold(false)
    .line(data.restaurantName)
    .divider("=")
    .align("left")
    .row(`${L("order")}: ` + data.orderNumber, `${L("time")}: ` + data.date.split(" ").slice(1).join(" "))
    .row(`${L("table")}: ` + data.tableNumber, `${L("type")}: ` + orderType)
    .divider("-")
    .bold(true)
    .row(L("itemName"), L("qty"))
    .bold(false)
    .divider("-");

  data.items.forEach((item) => {
    builder.size("double-height").bold(true).row(item.name, `x ${item.quantity}`).size("normal").bold(false);
    if (item.notes) {
      builder.line(`  ---> ${L("note")}: ${item.notes}`);
    }
  });

  builder.divider("=").align("center").line(L("endKot")).cut();

  return {
    uint8Array: builder.getUint8Array(),
    hex: builder.getHexString(),
  };
}

/** Slim customer pickup slip — token only. */
export function generateEscPosTokenSlip(data: {
  restaurantName: string;
  tokenNumber: string;
  orderNumber?: string;
  date: string;
  totalAmount?: number;
  currency?: string;
  paymentCollected?: boolean;
  customerName?: string;
  paperWidth: "80mm" | "58mm";
}): { uint8Array: Uint8Array; hex: string } {
  const builder = new EscPosBuilder(data.paperWidth);
  const lang: ReceiptLang = "en";
  const L = (key: Parameters<typeof receiptLabel>[0]) => receiptLabel(key, lang);
  const paid = data.paymentCollected !== false;

  builder
    .align("center")
    .bold(true)
    .line(data.restaurantName)
    .bold(false)
    .divider("-")
    .size("double")
    .bold(true)
    .line(L("token"))
    .line(data.tokenNumber)
    .size("normal")
    .bold(false)
    .divider("-");

  if (data.customerName) builder.line(data.customerName);
  if (data.orderNumber) builder.line(`${L("billNo")}: ${data.orderNumber}`);
  builder.line(data.date);

  if (data.totalAmount != null && data.currency) {
    builder.bold(true).line(`${data.currency}${data.totalAmount.toFixed(2)}`).bold(false);
  }

  builder
    .feed(1)
    .size("double-height")
    .bold(true)
    .line(paid ? L("paid") : L("payAtPickup"))
    .size("normal")
    .bold(false)
    .feed(1)
    .line(L("keepSlip"))
    .feed(3)
    .cut();

  return {
    uint8Array: builder.getUint8Array(),
    hex: builder.getHexString(),
  };
}

/** Immediate ESC @ reset — use to stop runaway blank feed. */
export function generatePrinterReset(): Uint8Array {
  return new Uint8Array([0x1B, 0x40]);
}
