"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Usb,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { PrintableReceipt, ReceiptProps } from "@/components/PrintableReceipt";
import { UserAvatar } from "@/components/UserAvatar";
import { useTranslation } from "@/lib/i18n";

type BillLine = { id: string; name: string; price: number; quantity: number };
type Table = { id: string; name: string };
type MenuItem = { id: string; categoryId: string; name: string; price: number; isFavorite?: boolean };
type Category = { id: string; name: string };
type SessionStatus = "empty" | "ongoing" | "ready";

type TableSession = {
  tableId: string;
  status: SessionStatus;
  items: BillLine[];
  customerName: string;
  paymentMethod: string;
  orderType: string;
  receipt: any | null;
};

type AppSettings = {
  restaurantName: string;
  tagline: string;
  address: string;
  phone: string;
  currency: string;
  taxRate: string;
  aboutUs: string;
  footerText: string;
  upiId: string;
};

type Props = {
  settings: AppSettings;
  tables: Table[];
  categories: Category[];
  menuItems: MenuItem[];
  currentUser: { id: string; username: string; role: string; avatar?: string };
  onLogout: () => void;
};

const statusColor: Record<SessionStatus, string> = {
  empty: "bg-red-500 border-red-600 text-white",
  ongoing: "bg-amber-400 border-amber-500 text-slate-900",
  ready: "bg-emerald-500 border-emerald-600 text-white",
};

const statusLabelKey: Record<SessionStatus, string> = {
  empty: "Empty",
  ongoing: "Ongoing",
  ready: "Bill Ready",
};

export function LaptopBoard({
  settings,
  tables,
  categories,
  menuItems,
  currentUser,
  onLogout,
}: Props) {
  const { t, lang, toggleLang } = useTranslation();
  const [sessions, setSessions] = useState<Record<string, TableSession>>({});
  const [stationReady, setStationReady] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerStatus, setPrinterStatus] = useState("No printer connected");
  const [printerError, setPrinterError] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [printData, setPrintData] = useState<ReceiptProps | null>(null);
  const [toast, setToast] = useState("");
  const portRef = useRef<any>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const boardTables = useMemo(
    () => [{ id: "PARCEL", name: "PARCEL" }, ...tables],
    [tables]
  );

  const getSession = (tableId: string): TableSession =>
    sessions[tableId] || {
      tableId,
      status: "empty",
      items: [],
      customerName: "",
      paymentMethod: "Cash",
      orderType: tableId === "PARCEL" ? "Takeaway" : "Dine-In",
      receipt: null,
    };

  const selected = selectedId ? getSession(selectedId) : null;
  const selectedName =
    selectedId === "PARCEL"
      ? selected?.customerName
        ? `Parcel: ${selected.customerName}`
        : "Parcel (Takeaway)"
      : tables.find((t) => t.id === selectedId)?.name || selectedId || "";

  const loadSessions = async () => {
    try {
      const res = await fetch("/api/table-sessions");
      if (!res.ok) return;
      const json = await res.json();
      const map: Record<string, TableSession> = {};
      for (const s of json.sessions || []) {
        map[s.tableId] = s;
      }
      setSessions(map);
    } catch (e) {
      console.error(e);
    }
  };

  const sendHeartbeat = async (connected: boolean) => {
    try {
      const res = await fetch("/api/print-station", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online: true, printerConnected: connected }),
      });
      if (res.ok) {
        const json = await res.json();
        setStationReady(!!json.station?.isReady);
      }
    } catch (e) {
      console.error(e);
      setStationReady(false);
    }
  };

  useEffect(() => {
    if (categories.length && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    loadSessions();
    const poll = setInterval(loadSessions, 2500);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    sendHeartbeat(printerConnected);
    const beat = setInterval(() => sendHeartbeat(printerConnected), 6000);
    return () => {
      clearInterval(beat);
      // mark offline best-effort on unmount
      fetch("/api/print-station", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online: false, printerConnected: false }),
      }).catch(() => {});
    };
  }, [printerConnected]);

  useEffect(() => {
    const tryAuto = async () => {
      if (!("serial" in navigator)) return;
      try {
        const ports = await (navigator as any).serial.getPorts();
        if (ports?.length > 0) {
          await ports[0].open({ baudRate: 9600 });
          portRef.current = ports[0];
          setPrinterConnected(true);
          setPrinterStatus("Printer connected & ready");
        }
      } catch {}
    };
    tryAuto();
  }, []);

  const connectPrinter = async () => {
    setPrinterError("");
    if (!("serial" in navigator)) {
      setPrinterError("Use Chrome/Edge on this laptop to connect the USB printer.");
      return;
    }
    try {
      setPrinterStatus("Detecting printer...");
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setPrinterConnected(true);
      setPrinterStatus("Printer connected & ready");
    } catch (err: any) {
      setPrinterConnected(false);
      setPrinterStatus("No printer connected");
      if (err?.name !== "NotFoundError") setPrinterError(err.message || "Could not connect.");
    }
  };

  const disconnectPrinter = async () => {
    try {
      if (portRef.current) await portRef.current.close();
    } catch {}
    portRef.current = null;
    setPrinterConnected(false);
    setPrinterStatus("No printer connected");
  };

  const persistSession = async (session: TableSession, extra?: Partial<TableSession> & { markReady?: boolean; clear?: boolean; receipt?: any }) => {
    const res = await fetch("/api/table-sessions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId: session.tableId,
        items: extra?.items ?? session.items,
        customerName: extra?.customerName ?? session.customerName,
        paymentMethod: extra?.paymentMethod ?? session.paymentMethod,
        orderType: extra?.orderType ?? session.orderType,
        updatedBy: currentUser.username,
        markReady: extra?.markReady,
        clear: extra?.clear,
        receipt: extra?.receipt,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Save failed");
    if (json.session) {
      setSessions((prev) => ({ ...prev, [json.session.tableId]: json.session }));
    }
    return json;
  };

  const schedulePersist = (next: TableSession) => {
    setSessions((prev) => ({ ...prev, [next.tableId]: next }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistSession(next).catch((e) => {
        console.error(e);
        setToast(e.message || "Failed to save");
        loadSessions();
      });
    }, 300);
  };

  const buildReceipt = (session: TableSession, tableName: string): ReceiptProps => {
    const lines = session.items;
    const sub = lines.reduce((a, l) => a + l.price * l.quantity, 0);
    const rate = parseFloat(settings.taxRate || "0") || 0;
    const tax = (sub * rate) / 100;
    return {
      restaurantName: settings.restaurantName,
      tagline: settings.tagline,
      address: settings.address,
      phone: settings.phone,
      currency: settings.currency,
      orderNumber: session.receipt?.orderNumber || `BILL-${Date.now().toString().slice(-6)}`,
      tableNumber: tableName,
      orderType: tableName.startsWith("Parcel") ? "Takeaway" : "Dine-In",
      date: new Date().toLocaleString(),
      items: lines.map((l) => ({ name: l.name, price: l.price, quantity: l.quantity })),
      subtotal: sub,
      taxAmount: tax,
      taxRate: rate,
      serviceCharge: 0,
      serviceChargeRate: 0,
      discountAmount: 0,
      totalAmount: sub + tax,
      paymentMethod: session.paymentMethod || "Cash",
      customerName: session.customerName || undefined,
      aboutUs: settings.aboutUs,
      footerText: settings.footerText,
      upiId: settings.upiId,
      paperWidth: "80mm",
      receiptHeaderNote: "",
    };
  };

  const printReceipt = async (data: ReceiptProps) => {
    if (printerConnected && portRef.current) {
      setPrinterStatus("Printing...");
      const res = await fetch("/api/escpos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "receipt", data }),
      });
      const json = await res.json();
      if (json.success && json.bytes) {
        const writer = portRef.current.writable.getWriter();
        await writer.write(new Uint8Array(json.bytes));
        writer.releaseLock();
        setPrinterStatus("Printed! Printer connected & ready");
        return;
      }
      throw new Error(json.error || "ESC/POS failed");
    }
    setPrintData(data);
    setTimeout(() => window.print(), 150);
  };

  const finishAndClear = async (tableId: string, data: ReceiptProps) => {
    await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await persistSession(getSession(tableId), { clear: true, items: [] });
    setToast(t("Printed & cleared"));
    setTimeout(() => setToast(""), 2000);
  };

  const handleTableClick = async (tableId: string) => {
    const session = getSession(tableId);
    if (session.status === "ready") {
      if (!printerConnected && !("serial" in navigator)) {
        setPrinterError("Connect printer on this laptop first.");
        return;
      }
      setIsPrinting(true);
      setPrinterError("");
      try {
        const name =
          tableId === "PARCEL"
            ? session.customerName
              ? `Parcel: ${session.customerName}`
              : "Parcel (Takeaway)"
            : tables.find((t) => t.id === tableId)?.name || tableId;
        const data = (session.receipt as ReceiptProps) || buildReceipt(session, name);
        await printReceipt(data);
        await finishAndClear(tableId, data);
        setSelectedId(null);
      } catch (err: any) {
        setPrinterError(err.message || "Print failed");
      } finally {
        setIsPrinting(false);
      }
      return;
    }
    setSelectedId(tableId);
  };

  const updateSelectedItems = (items: BillLine[]) => {
    if (!selectedId) return;
    const next: TableSession = {
      ...getSession(selectedId),
      items,
      status: items.length ? "ongoing" : "empty",
      receipt: null,
    };
    schedulePersist(next);
  };

  const addItem = (item: MenuItem) => {
    if (!selected) return;
    const lines = [...selected.items];
    const idx = lines.findIndex((l) => l.id === item.id);
    if (idx > -1) lines[idx] = { ...lines[idx], quantity: lines[idx].quantity + 1 };
    else lines.push({ id: item.id, name: item.name, price: item.price, quantity: 1 });
    updateSelectedItems(lines);
  };

  const changeQty = (itemId: string, delta: number) => {
    if (!selected) return;
    const lines = selected.items
      .map((l) => (l.id === itemId ? { ...l, quantity: l.quantity + delta } : l))
      .filter((l) => l.quantity > 0);
    updateSelectedItems(lines);
  };

  const markReady = async () => {
    if (!selected || !selectedId || selected.items.length === 0) return;
    setIsPrinting(true);
    try {
      const data = buildReceipt(selected, selectedName);
      await persistSession(selected, { markReady: true, receipt: data, items: selected.items });
      setToast(t("Marked ready (green)"));
      setTimeout(() => setToast(""), 2000);
      setSelectedId(null);
    } catch (err: any) {
      setPrinterError(err.message || "Connect laptop");
    } finally {
      setIsPrinting(false);
    }
  };

  const printNow = async () => {
    if (!selected || !selectedId || selected.items.length === 0) return;
    setIsPrinting(true);
    setPrinterError("");
    try {
      const data = buildReceipt(selected, selectedName);
      await printReceipt(data);
      await finishAndClear(selectedId, data);
      setSelectedId(null);
    } catch (err: any) {
      setPrinterError(err.message || "Print failed");
    } finally {
      setIsPrinting(false);
    }
  };

  const itemsToShow = menuItems.filter((m) => m.categoryId === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-bold text-xl">{settings.restaurantName}</h1>
          <p className="text-xs text-slate-400">{t("Laptop Print Station")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              stationReady
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-red-500/20 text-red-300 border-red-500/40"
            }`}
          >
            {stationReady ? t("Online for phones") : t("Not ready for phones")}
          </div>
          <div
            className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold ${
              printerConnected
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-slate-800 text-slate-300 border border-slate-700"
            }`}
          >
            {printerConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {t(printerStatus)}
          </div>
          {printerConnected ? (
            <button onClick={disconnectPrinter} className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5">
              <Usb className="w-4 h-4" /> {t("Disconnect")}
            </button>
          ) : (
            <button onClick={connectPrinter} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5">
              <Usb className="w-4 h-4" /> {t("Detect Printer")}
            </button>
          )}
          <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
            <UserAvatar name={currentUser.username} avatar={currentUser.avatar} size="sm" />
            <span className="text-sm text-slate-300">{currentUser.username}</span>
            <button onClick={toggleLang} className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded">
              {lang === "en" ? "अ" : "EN"}
            </button>
            <button onClick={onLogout} className="text-xs underline text-slate-400 hover:text-white">
              {t("Logout")}
            </button>
          </div>
        </div>
      </header>

      {(printerError || toast) && (
        <div
          className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 print:hidden ${
            printerError ? "bg-red-950 text-red-200" : "bg-emerald-950 text-emerald-200"
          }`}
        >
          {printerError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {printerError || toast}
        </div>
      )}

      <main className="flex-1 p-4 print:hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> {t("Empty")}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400" /> {t("Ongoing")}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> {t("Bill Ready — click to print")}</span>
          </div>
          <button onClick={loadSessions} className="text-slate-400 hover:text-white text-sm flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> {t("Refresh")}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {boardTables.map((tbl) => {
            const s = getSession(tbl.id);
            const qty = s.items.reduce((a, l) => a + l.quantity, 0);
            return (
              <button
                key={tbl.id}
                type="button"
                disabled={isPrinting}
                onClick={() => handleTableClick(tbl.id)}
                className={`rounded-2xl border-2 p-5 min-h-[120px] text-left shadow-lg transition-transform active:scale-95 ${statusColor[s.status]} ${
                  selectedId === tbl.id ? "ring-4 ring-white/40" : ""
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wide opacity-80">{t(statusLabelKey[s.status])}</div>
                <div className="text-2xl font-black mt-1">{tbl.name}</div>
                {qty > 0 && <div className="mt-2 text-sm font-semibold opacity-90">{qty} {t("items")}</div>}
                {s.status === "ready" && (
                  <div className="mt-3 inline-flex items-center gap-1 text-sm font-bold bg-black/20 px-2 py-1 rounded-lg">
                    <Printer className="w-4 h-4" /> {t("Print")}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {selected && selected.status !== "ready" && selectedId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-end print:hidden">
          <div className="w-full max-w-xl bg-slate-900 h-full overflow-y-auto border-l border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">{selectedName}</h2>
                <p className="text-xs text-slate-400">{t(statusLabelKey[selected.status])} — {t("edit or print")}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedId === "PARCEL" && (
              <div className="p-4 border-b border-slate-800">
                <label className="text-xs font-bold text-slate-400">{t("Customer Name")}</label>
                <input
                  value={selected.customerName}
                  onChange={(e) =>
                    schedulePersist({ ...selected, customerName: e.target.value })
                  }
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                  placeholder={t("Customer name")}
                />
              </div>
            )}

            <div className="p-4 border-b border-slate-800 space-y-2">
              {selected.items.length === 0 && (
                <p className="text-sm text-slate-500">{t("No items yet. Add from menu below.")}</p>
              )}
              {selected.items.map((l) => (
                <div key={l.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                  <div>
                    <div className="font-semibold text-sm">{l.name}</div>
                    <div className="text-xs text-slate-400">
                      {settings.currency}
                      {l.price} × {l.quantity}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQty(l.id, -1)} className="p-1.5 bg-slate-700 rounded">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-bold">{l.quantity}</span>
                    <button onClick={() => changeQty(l.id, 1)} className="p-1.5 bg-slate-700 rounded">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 flex-1">
              <div className="flex gap-2 overflow-x-auto mb-3">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                      selectedCategory === c.id ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {itemsToShow.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => addItem(m)}
                    className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 text-left"
                  >
                    <div className="font-semibold text-sm">{m.name}</div>
                    <div className="text-xs text-amber-400 mt-1">
                      {settings.currency}
                      {m.price}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-700 grid grid-cols-2 gap-2">
              <button
                onClick={markReady}
                disabled={selected.items.length === 0 || isPrinting}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 font-bold py-3 rounded-xl"
              >
                {t("Generate Bill")}
              </button>
              <button
                onClick={printNow}
                disabled={selected.items.length === 0 || isPrinting}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                {isPrinting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {t("Print Bill")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="thermal-print-section" className="hidden print:block">
        {printData && <PrintableReceipt {...printData} />}
      </div>
    </div>
  );
}
