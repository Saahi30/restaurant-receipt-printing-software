"use client";

import React from "react";
import QRCode from "react-qr-code";
import { useTranslation } from "@/lib/i18n";

/**
 * Builds a standard UPI deep-link (UPI Intent URI).
 * Format:  upi://pay?pa=<VPA>&pn=<Payee Name>&am=<Amount>&cu=INR&tn=<Note>
 *   pa  -> Payee VPA / UPI ID (e.g. mahankalfoodpark@okhdfcbank)
 *   pn  -> Payee display name
 *   am  -> Amount, auto-set from the bill total (2 decimals)
 *   cu  -> Currency code (INR)
 *   tn  -> Transaction note (bill number + table)
 * Any UPI app (GPay, PhonePe, Paytm, BHIM) that scans this QR opens a
 * payment request with the VPA and amount pre-filled — the customer only
 * has to enter their UPI PIN.
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

export interface ReceiptItem {
  id?: number;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface ReceiptProps {
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
  items: ReceiptItem[];
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
  wifiSSID?: string;
  wifiPassword?: string;
  paperWidth: "80mm" | "58mm";
  upiId?: string;
  receiptHeaderNote?: string;
  isKOT?: boolean;
}

export const PrintableReceipt = React.forwardRef<HTMLDivElement, ReceiptProps>((props, ref) => {
  const { t } = useTranslation();
  const {
    restaurantName,
    tagline,
    address,
    phone,
    gstNumber,
    currency = "$",
    orderNumber,
    tableNumber,
    orderType,
    date,
    customerName,
    customerPhone,
    items = [],
    subtotal = 0,
    taxAmount = 0,
    taxRate = 5,
    serviceCharge = 0,
    serviceChargeRate = 2.5,
    discountAmount = 0,
    discountReason,
    totalAmount = 0,
    paymentMethod = "Cash",
    footerText,
    aboutUs,
    wifiSSID,
    wifiPassword,
    paperWidth = "80mm",
    upiId,
    receiptHeaderNote = "DINE-IN BILL / TAX INVOICE",
    isKOT = false,
  } = props;

  const widthClass = paperWidth === "58mm" ? "max-w-[58mm] text-[11px]" : "max-w-[80mm] text-[13px]";

  // Build the UPI deep-link only when a VPA / UPI ID is configured.
  // The amount (am) is auto-set to this bill's grand total.
  const upiPayUrl =
    upiId && upiId.trim() !== ""
      ? buildUpiLink({
          vpa: upiId,
          payeeName: restaurantName,
          amount: totalAmount,
          note: `Bill ${orderNumber} - ${tableNumber}`,
        })
      : "";

  if (isKOT) {
    return (
      <div
        ref={ref}
        className={`bg-white text-black font-mono mx-auto p-3 shadow-sm border border-gray-300 leading-tight ${widthClass} print:shadow-none print:border-none print:m-0 print:w-full print:max-w-none`}
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        <div className="text-center border-b-2 border-black pb-2 mb-2">
          <div className="text-base font-extrabold uppercase tracking-wider bg-black text-white py-0.5 px-2 inline-block">
            KITCHEN ORDER TOKEN (KOT)
          </div>
          <div className="font-bold text-sm mt-1">{restaurantName}</div>
        </div>

        <div className="flex justify-between border-b border-dashed border-gray-400 pb-2 mb-2 text-xs">
          <div>
            <span className="font-bold">Order:</span> {orderNumber}<br />
            <span className="font-bold">Type:</span> {orderType}
          </div>
          <div className="text-right">
            <span className="font-bold text-sm bg-gray-200 px-1 py-0.5 rounded">{tableNumber}</span><br />
            <span className="text-[10px]">{date.split(" ").slice(1).join(" ")}</span>
          </div>
        </div>

        <table className="w-full text-left border-collapse mb-2">
          <thead>
            <tr className="border-b-2 border-black text-xs">
              <th className="py-1 font-extrabold">ITEM DESCRIPTION</th>
              <th className="py-1 text-right font-extrabold w-12">QTY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, idx) => (
              <tr key={idx} className="font-bold text-sm">
                <td className="py-1.5 pr-2">
                  <div>{item.name}</div>
                  {item.notes && (
                    <div className="text-xs font-normal text-red-600 bg-red-50 p-0.5 rounded mt-0.5 inline-block">
                      ↳ Note: {item.notes}
                    </div>
                  )}
                </td>
                <td className="py-1.5 text-right font-extrabold text-base">x {item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t-2 border-black pt-2 text-center font-bold text-xs">
          *** END OF KITCHEN ORDER ***
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`bg-white text-black font-mono mx-auto p-4 shadow-md border border-gray-300 leading-snug ${widthClass} print:shadow-none print:border-none print:m-0 print:p-2 print:w-full print:max-w-none`}
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* Header */}
      <div className="text-center pb-2 border-b border-dashed border-gray-400">
        {receiptHeaderNote && (
          <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-0.5">
            {receiptHeaderNote}
          </div>
        )}
        <div className="font-extrabold text-lg uppercase tracking-tight text-black">{restaurantName}</div>
        {tagline && <div className="text-xs text-gray-700 italic">{tagline}</div>}
        {address && <div className="text-xs text-gray-800 mt-1">{address}</div>}
        {phone && <div className="text-xs text-gray-800">Tel: {phone}</div>}
        {gstNumber && <div className="text-xs font-bold text-black mt-1 bg-gray-100 py-0.5 rounded px-1 inline-block">{gstNumber}</div>}
      </div>

      {/* Bill & Customer Meta */}
      <div className="py-2 border-b border-dashed border-gray-400 text-xs">
        <div className="flex justify-between">
          <span><span className="font-bold">{t("Bill No")}:</span> {orderNumber}</span>
          <span><span className="font-bold">{t("Date")}:</span> {date.split(" ")[0]}</span>
        </div>
        <div className="flex justify-between mt-0.5">
          <span><span className="font-bold">{t("Table")}:</span> <strong className="bg-gray-200 px-1 rounded">{tableNumber}</strong></span>
          <span><span className="font-bold">{t("Mode")}:</span> {orderType}</span>
        </div>
        {customerName && (
          <div className="mt-1 pt-1 border-t border-dotted border-gray-300 text-[11px]">
            <span className="font-bold">Customer:</span> {customerName} {customerPhone ? `(${customerPhone})` : ""}
          </div>
        )}
        {paymentMethod.toLowerCase() === "udhaar" && (
          <div className="mt-2 text-center bg-black text-white font-bold py-1 text-sm tracking-widest uppercase">
            UDHAAR (UNPAID)
          </div>
        )}
      </div>

      {/* Item Table */}
      <table className="w-full text-left border-collapse my-2">
        <thead>
          <tr className="border-b border-black text-xs font-bold">
            <th className="py-1">{t("Item")}</th>
            <th className="py-1 text-center w-12">{t("Qty")}</th>
            <th className="py-1 text-right w-14">{t("Rate")}</th>
            <th className="py-1 text-right w-16">{t("Total")} ({currency})</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dotted divide-gray-300 text-xs">
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              <tr>
                <td className="py-1 font-semibold pr-1">{item.name}</td>
                <td className="py-1 text-center font-bold">{item.quantity}</td>
                <td className="py-1 text-right text-gray-700">{item.price.toFixed(2)}</td>
                <td className="py-1 text-right font-bold">{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
              {item.notes && (
                <tr>
                  <td colSpan={4} className="pb-1 text-[10px] text-gray-600 italic pl-2">
                    * {item.notes}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Financial Totals */}
      <div className="border-t border-black pt-1.5 text-xs space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-medium">{currency}{subtotal.toFixed(2)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Discount {discountReason ? `(${discountReason})` : ""}</span>
            <span className="font-bold">-{currency}{discountAmount.toFixed(2)}</span>
          </div>
        )}

        {serviceCharge > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Service Charge ({serviceChargeRate}%)</span>
            <span>{currency}{serviceCharge.toFixed(2)}</span>
          </div>
        )}

        {taxAmount > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Tax / GST ({taxRate}%)</span>
            <span>{currency}{taxAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="border-t-2 border-double border-black pt-1.5 mt-1 flex justify-between text-sm font-extrabold text-black">
          <span>GRAND TOTAL:</span>
          <span>{currency}{totalAmount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-[11px] pt-1 text-gray-800">
          <span>Payment Mode:</span>
          <span className="font-bold uppercase bg-gray-200 px-1.5 py-0.5 rounded text-black">{paymentMethod}</span>
        </div>
      </div>

      {/* QR Code & WiFi Footer */}
      <div className="mt-3 pt-2 border-t border-dashed border-gray-400 text-center">
        {upiPayUrl !== "" && (
          <div className="mb-2 inline-block bg-white p-2 border border-gray-300 rounded">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Scan & Pay via UPI
            </div>
            {/* Real, scannable QR code encoding the upi://pay deep-link.
                The amount is auto-set to this bill's grand total. */}
            <QRCode
              value={upiPayUrl}
              size={paperWidth === "58mm" ? 84 : 100}
              bgColor="#FFFFFF"
              fgColor="#000000"
              level="M"
            />
            <div className="text-[11px] font-extrabold text-black mt-1">
              {currency}
              {totalAmount.toFixed(2)}
            </div>
            <div className="text-[9px] text-gray-600 font-mono break-all max-w-[120px] mx-auto">
              {upiId}
            </div>
          </div>
        )}

        {wifiSSID && (
          <div className="bg-gray-100 p-1.5 rounded my-1 text-[11px]">
            <div className="font-bold">Free Guest Wi-Fi</div>
            <div>Network: <strong>{wifiSSID}</strong></div>
            {wifiPassword && <div>Password: <strong>{wifiPassword}</strong></div>}
          </div>
        )}

        {aboutUs && aboutUs.trim() !== "" && (
          <div className="mt-2 pt-2 border-t border-dashed border-gray-400 text-[11px] text-black whitespace-pre-line leading-snug text-center">
            {aboutUs}
          </div>
        )}

        {footerText && (
          <div className="text-xs text-black font-bold my-2 pt-2 border-t border-dashed border-gray-400">
            {footerText}
          </div>
        )}
      </div>
    </div>
  );
});

PrintableReceipt.displayName = "PrintableReceipt";
