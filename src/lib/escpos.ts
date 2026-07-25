// ESC/POS Thermal Printer Command Generator

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
  footerText?: string;
  aboutUs?: string;
  upiId?: string;
  wifiSSID?: string;
  wifiPassword?: string;
  paperWidth: "80mm" | "58mm"; // 80mm = ~48 chars per line, 58mm = ~32 chars per line
  cutPaper?: boolean;
  openDrawer?: boolean;
}

export class EscPosBuilder {
  private buffer: number[] = [];
  private maxChars: number;

  constructor(paperWidth: "80mm" | "58mm" = "80mm") {
    this.maxChars = paperWidth === "58mm" ? 32 : 48;
    this.init();
  }

  // ESC @ - Initialize printer
  init(): this {
    this.buffer.push(0x1B, 0x40);
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
    paragraphs.forEach((para) => {
      if (para.trim() === "") {
        this.line("");
        return;
      }
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

  feed(lines: number = 3): this {
    this.buffer.push(0x1B, 0x64, lines);
    return this;
  }

  // GS V - Paper Cut
  cut(): this {
    this.feed(3);
    this.buffer.push(0x1D, 0x56, 0x41, 0x03);
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

  if (data.openDrawer) {
    builder.drawer();
  }

  // Header
  builder.align("center").size("double").bold(true).line(data.restaurantName);
  builder.size("normal").bold(false);
  
  if (data.tagline) builder.line(data.tagline);
  if (data.address) builder.line(data.address);
  if (data.phone) builder.line(`Tel: ${data.phone}`);
  if (data.gstNumber) builder.bold(true).line(data.gstNumber).bold(false);
  
  builder.divider("=");
  
  // Bill Info
  builder.align("left");
  builder.row("Bill No: " + data.orderNumber, "Date: " + data.date.split(" ")[0]);
  builder.row("Type: " + data.orderType, "Table: " + data.tableNumber);
  if (data.customerName) {
    builder.row("Customer: " + data.customerName, data.customerPhone || "");
  }

  builder.divider("-");
  
  // Table Header
  builder.bold(true);
  builder.row3("Item", "Qty x Rate", "Total (" + data.currency + ")");
  builder.bold(false);
  builder.divider("-");

  // Items
  data.items.forEach((item) => {
    const rateStr = `${item.quantity}x${item.price.toFixed(2)}`;
    const totalStr = item.total.toFixed(2);
    builder.row3(item.name, rateStr, totalStr);
    if (item.notes) {
      builder.line(`  * ${item.notes}`);
    }
  });

  builder.divider("-");

  // Totals
  builder.row("Subtotal:", `${data.currency}${data.subtotal.toFixed(2)}`);
  
  if (data.discountAmount > 0) {
    const reason = data.discountReason ? ` (${data.discountReason})` : "";
    builder.row(`Discount${reason}:`, `-${data.currency}${data.discountAmount.toFixed(2)}`);
  }

  if (data.serviceCharge > 0) {
    builder.row(`Service Charge (${data.serviceChargeRate}%):`, `${data.currency}${data.serviceCharge.toFixed(2)}`);
  }

  if (data.taxAmount > 0) {
    builder.row(`Tax / GST (${data.taxRate}%):`, `${data.currency}${data.taxAmount.toFixed(2)}`);
  }

  builder.divider("=");
  
  builder.size("double-height").bold(true);
  builder.row("TOTAL AMOUNT:", `${data.currency}${data.totalAmount.toFixed(2)}`);
  builder.size("normal").bold(false);
  
  builder.divider("=");
  builder.row("Payment Mode:", data.paymentMethod.toUpperCase());

  // UPI payment info (VPA only — amount auto-fills when customer scans the QR)
  if (data.upiId && data.upiId.trim() !== "") {
    builder.divider("-");
    builder.line("PAY VIA UPI (Scan QR on counter)");
    builder.line("UPI ID: " + data.upiId.trim());
    builder.line("Amount auto-set to bill total");
  }

  // Footer
  builder.feed(1).align("center");
  if (data.wifiSSID) {
    builder.line(`Free WiFi: ${data.wifiSSID} | Pwd: ${data.wifiPassword || "None"}`);
  }
  if (data.aboutUs && data.aboutUs.trim() !== "") {
    builder.divider("-");
    builder.wrap(data.aboutUs);
  }

  if (data.footerText) {
    builder.divider("-");
    builder.bold(true).wrap(data.footerText).bold(false);
  }

  if (data.cutPaper !== false) {
    builder.cut();
  } else {
    builder.feed(4);
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
}): { uint8Array: Uint8Array; hex: string } {
  const builder = new EscPosBuilder(data.paperWidth);

  builder
    .align("center")
    .size("double")
    .bold(true)
    .line("KITCHEN ORDER (KOT)")
    .size("normal")
    .bold(false)
    .line(data.restaurantName)
    .divider("=")
    .align("left")
    .row("Order: " + data.orderNumber, "Time: " + data.date.split(" ").slice(1).join(" "))
    .row("Table: " + data.tableNumber, "Type: " + data.orderType)
    .divider("-")
    .bold(true)
    .row("ITEM NAME", "QTY")
    .bold(false)
    .divider("-");

  data.items.forEach((item) => {
    builder.size("double-height").bold(true).row(item.name, `x ${item.quantity}`).size("normal").bold(false);
    if (item.notes) {
      builder.line(`  ---> NOTE: ${item.notes}`);
    }
  });

  builder.divider("=").align("center").line("*** END OF KOT ***").cut();

  return {
    uint8Array: builder.getUint8Array(),
    hex: builder.getHexString(),
  };
}
