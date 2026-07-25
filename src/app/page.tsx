"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  Usb,
  Plus,
  Minus,
  Trash2,
  Receipt,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  Store,
  Eye,
  QrCode,
  Shield,
} from "lucide-react";
import { PrintableReceipt, ReceiptProps } from "@/components/PrintableReceipt";
import Link from "next/link";

interface User {
  id: string;
  username: string;
  password?: string;
  role: "admin" | "waiter";
}

interface BillLine {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

type BillsState = Record<string, BillLine[]>;

interface AppSettings {
  restaurantName: string;
  tagline: string;
  address: string;
  phone: string;
  currency: string;
  taxRate: string;
  aboutUs: string;
  footerText: string;
  upiId: string;
}

const FALLBACK: AppSettings = {
  restaurantName: "MAHANKAL FOOD PARK",
  tagline: "Family Restaurant & Party Venue",
  address: "Mahankal Road, Kathmandu",
  phone: "+977 98XXXXXXXX",
  currency: "Rs.",
  taxRate: "13.00",
  aboutUs:
    "ABOUT US\nMahankal Food Park is a family restaurant serving fresh Nepali, Indian & Chinese cuisine.\nWe also host parties, catering & events.\n\nOpen Daily: 10:00 AM - 11:00 PM",
  footerText: "Thank you for visiting! Please come again.",
  upiId: "",
};

interface Table {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  isFavorite?: boolean;
}

export default function HomePage() {
  const [tab, setTab] = useState<"billing" | "about">("billing");
  const [loading, setLoading] = useState(true);
  
  const [settings, setSettings] = useState<AppSettings>(FALLBACK);
  const [form, setForm] = useState<AppSettings>(FALLBACK);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUserForLogin, setSelectedUserForLogin] = useState<User | null>(null);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI" | "Udhaar">("Cash");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [bills, setBills] = useState<BillsState>({});
  const [printData, setPrintData] = useState<ReceiptProps | null>(null);

  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerStatus, setPrinterStatus] = useState("No printer connected");
  const [printerError, setPrinterError] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const portRef = useRef<any>(null);

  // ---- Load settings and data ----
  useEffect(() => {
    const load = async () => {
      try {
        const [resSettings, resData] = await Promise.all([
          fetch("/api/settings").catch(() => null),
          fetch("/api/admin-data").catch(() => null)
        ]);
        
        if (resSettings && resSettings.ok) {
          const json = await resSettings.json();
          const merged: AppSettings = {
            restaurantName: json.restaurantName ?? FALLBACK.restaurantName,
            tagline: json.tagline ?? FALLBACK.tagline,
            address: json.address ?? FALLBACK.address,
            phone: json.phone ?? FALLBACK.phone,
            currency: json.currency ?? FALLBACK.currency,
            taxRate: json.taxRate ?? FALLBACK.taxRate,
            aboutUs: json.aboutUs ?? FALLBACK.aboutUs,
            footerText: json.footerText ?? FALLBACK.footerText,
            upiId: json.upiId ?? FALLBACK.upiId,
          };
          setSettings(merged);
          setForm(merged);
        }
        
        if (resData && resData.ok) {
          const json = await resData.json();
          setTables(json.tables || []);
          setCategories(json.categories || []);
          setMenuItems(json.menuItems || []);
          setAllUsers(json.users || []);
          if (json.tables?.length > 0) setSelectedTable(json.tables[0].id);
          if (json.categories?.length > 0) setSelectedCategory(json.categories[0].id);
        }

        // Check local storage for session
        const savedSession = localStorage.getItem("pos_session");
        if (savedSession) {
          try {
            setCurrentUser(JSON.parse(savedSession));
          } catch(e) {}
        }

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleUserBoxClick = (user: User) => {
    setLoginError("");
    if (user.role === "admin") {
      setSelectedUserForLogin(user);
      setLoginUsername(user.username);
      setLoginPassword("");
    } else {
      const sessionUser = { id: user.id, username: user.username, role: user.role };
      setCurrentUser(sessionUser as User);
      localStorage.setItem("pos_session", JSON.stringify(sessionUser));
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const user = allUsers.find(u => u.username === loginUsername && u.password === loginPassword);
    if (user && user.role === "admin") {
      const sessionUser = { id: user.id, username: user.username, role: user.role };
      setCurrentUser(sessionUser as User);
      localStorage.setItem("pos_session", JSON.stringify(sessionUser));
      setSelectedUserForLogin(null);
    } else {
      setLoginError("Invalid password");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedUserForLogin(null);
    localStorage.removeItem("pos_session");
    setLoginUsername("");
    setLoginPassword("");
  };

  const CURRENCY = settings.currency || "Rs.";
  const TAX_RATE = parseFloat(settings.taxRate || "0") || 0;

  const currentBill = bills[selectedTable] || [];
  const currentTableObj = tables.find(t => t.id === selectedTable);
  const currentTableName = selectedTable === "PARCEL" 
    ? (customerName ? `Parcel: ${customerName}` : "Parcel (Takeaway)") 
    : (currentTableObj ? currentTableObj.name : "Unknown Table");

  // ---- Bill actions ----
  const addItem = (item: { id: string; name: string; price: number }) => {
    if (!selectedTable) return;
    setBills((prev) => {
      const lines = prev[selectedTable] ? [...prev[selectedTable]] : [];
      const idx = lines.findIndex((l) => l.id === item.id);
      if (idx > -1) lines[idx] = { ...lines[idx], quantity: lines[idx].quantity + 1 };
      else lines.push({ id: item.id, name: item.name, price: item.price, quantity: 1 });
      return { ...prev, [selectedTable]: lines };
    });
  };

  const changeQty = (itemId: string, delta: number) => {
    setBills((prev) => {
      const lines = (prev[selectedTable] || [])
        .map((l) => (l.id === itemId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0);
      return { ...prev, [selectedTable]: lines };
    });
  };

  const clearBill = () => {
    setBills((prev) => ({ ...prev, [selectedTable]: [] }));
    if (selectedTable === "PARCEL") {
      setCustomerName("");
    }
  };

  const subtotal = currentBill.reduce((a, l) => a + l.price * l.quantity, 0);
  const taxAmount = (subtotal * TAX_RATE) / 100;
  const total = subtotal + taxAmount;

  // ---- Printer ----
  const connectPrinter = async () => {
    setPrinterError("");
    if (!("serial" in navigator)) {
      setPrinterError(
        "This browser can't connect directly to a printer. Use Google Chrome or Microsoft Edge on a computer, or use the 'Print (Browser)' button."
      );
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
      if (err && err.name !== "NotFoundError") setPrinterError(err.message || "Could not connect.");
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

  useEffect(() => {
    const tryAuto = async () => {
      if (!("serial" in navigator)) return;
      try {
        const ports = await (navigator as any).serial.getPorts();
        if (ports && ports.length > 0) {
          await ports[0].open({ baudRate: 9600 });
          portRef.current = ports[0];
          setPrinterConnected(true);
          setPrinterStatus("Printer connected & ready");
        }
      } catch {}
    };
    tryAuto();
  }, []);

  // ---- Receipt data ----
  const buildReceiptData = (src: AppSettings, lines: BillLine[], tableName: string): ReceiptProps => {
    const sub = lines.reduce((a, l) => a + l.price * l.quantity, 0);
    const rate = parseFloat(src.taxRate || "0") || 0;
    const tax = (sub * rate) / 100;
    return {
      restaurantName: src.restaurantName,
      tagline: src.tagline,
      address: src.address,
      phone: src.phone,
      currency: src.currency,
      orderNumber: `BILL-${Date.now().toString().slice(-6)}`,
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
      paymentMethod: paymentMethod,
      customerName: customerName.trim() !== "" ? customerName.trim() : undefined,
      aboutUs: src.aboutUs,
      footerText: src.footerText,
      upiId: src.upiId,
      paperWidth: "80mm",
      receiptHeaderNote: "",
    };
  };

  const makeBill = async () => {
    if (currentBill.length === 0) return;
    setPrinterError("");
    setIsPrinting(true);
    try {
      const data = buildReceiptData(settings, currentBill, currentTableName);

      // Save bill to history
      try {
        await fetch("/api/bills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.error("Failed to save bill", err);
      }

      if (printerConnected && portRef.current) {
        try {
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
          }
        } catch (err: any) {
          setPrinterError("Printer error: " + (err.message || "Could not print."));
        }
      } else {
        setPrintData(data);
        setTimeout(() => window.print(), 150);
      }
      clearBill();
    } finally {
      setIsPrinting(false);
    }
  };

  const browserPrint = async () => {
    if (currentBill.length === 0) return;
    const data = buildReceiptData(settings, currentBill, currentTableName);
    setPrintData(data);
    
    // Save bill to history
    try {
      await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error("Failed to save bill", err);
    }
    
    setTimeout(() => window.print(), 150);
    clearBill();
  };

  // ---- Settings save ----
  const setField = (k: keyof AppSettings, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSettings(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  // Live preview of the About Us section on the bill
  const previewItem = menuItems.length > 0 ? { id: "p1", name: menuItems[0].name, price: menuItems[0].price, quantity: 1 } : { id: "p1", name: "Example Item", price: 150, quantity: 1 };
  const previewData = buildReceiptData(
    form,
    [previewItem],
    "Table 1"
  );

  const fastItems = menuItems.filter(m => m.isFavorite);
  const itemsToShow = menuItems.filter(m => m.categoryId === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3 text-slate-600">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="font-semibold">Loading Mahankal Food Park…</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-2xl">
          <div className="flex justify-center mb-6">
            <div className="bg-amber-500 p-3 rounded-2xl shadow-md">
              <Store className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">{settings.restaurantName}</h1>
          <p className="text-center text-slate-500 mb-8">Select an account to login</p>
          
          {!selectedUserForLogin ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleUserBoxClick(u)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 hover:scale-105 ${
                    u.role === "admin" 
                      ? "border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100" 
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {u.role === "admin" ? <Shield className="w-8 h-8 mb-1" /> : <Store className="w-8 h-8 mb-1 opacity-70" />}
                  <span className="font-bold text-lg">{u.username}</span>
                  <span className="text-xs uppercase tracking-wider font-semibold opacity-60">{u.role}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">Admin Login: {selectedUserForLogin.username}</h2>
                <button 
                  onClick={() => setSelectedUserForLogin(null)}
                  className="text-sm text-slate-500 hover:text-slate-800 underline"
                >
                  Back
                </button>
              </div>
              <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {loginError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                    placeholder="Enter password"
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all mt-4"
                >
                  Login
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";
  const currentBillData = buildReceiptData(settings, currentBill, currentTableName);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 p-1.5 rounded-lg">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{settings.restaurantName}</h1>
              <p className="text-xs text-slate-400">Billing & Thermal Printing</p>
            </div>
          </div>
          
          {/* Admin Link & Logout */}
          <div className="flex items-center gap-3 ml-4">
            {isAdmin && (
              <Link href="/admin" className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                <Shield className="w-4 h-4" /> Admin Access
              </Link>
            )}
            <div className="text-sm font-medium text-slate-400 border-l border-slate-700 pl-3">
              {currentUser.username} ({currentUser.role})
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white text-xs underline">
              Logout
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setTab("billing")}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 ${
                tab === "billing" ? "bg-amber-500 text-white" : "text-slate-300 hover:text-white"
              }`}
            >
              <Receipt className="w-4 h-4" /> Billing
            </button>
            {isAdmin && (
              <button
                onClick={() => setTab("about")}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 ${
                  tab === "about" ? "bg-amber-500 text-white" : "text-slate-300 hover:text-white"
                }`}
              >
                <SettingsIcon className="w-4 h-4" /> Settings
              </button>
            )}
          </div>

          <div
            className={`hidden md:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold ${
              printerConnected
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-slate-700 text-slate-300 border border-slate-600"
            }`}
          >
            {printerConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{printerStatus}</span>
          </div>

          {printerConnected ? (
            <button
              onClick={disconnectPrinter}
              className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
            >
              <Usb className="w-4 h-4" /> Disconnect
            </button>
          ) : (
            <button
              onClick={connectPrinter}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
            >
              <Usb className="w-4 h-4" /> Detect Printer
            </button>
          )}
        </div>
      </header>

      {printerError && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 text-sm px-4 py-2 flex items-start gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{printerError}</span>
        </div>
      )}

      {/* ================= BILLING TAB ================= */}
      {tab === "billing" && (
        <>
          <div className="bg-white border-b border-slate-200 px-4 py-3 print:hidden">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex justify-between">
              <span>Select Table</span>
              {tables.length === 0 && <span className="text-amber-500">No tables configured! Go to Admin.</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTable("PARCEL")}
                className={`relative px-5 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                  selectedTable === "PARCEL"
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-lg scale-105"
                    : (bills["PARCEL"] || []).length > 0
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                PARCEL (Takeaway)
                {(bills["PARCEL"] || []).length > 0 && (
                  <span
                    className={`absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      selectedTable === "PARCEL" ? "bg-white text-emerald-600" : "bg-emerald-500 text-white"
                    }`}
                  >
                    {(bills["PARCEL"] || []).reduce((a, l) => a + l.quantity, 0)}
                  </span>
                )}
              </button>

              {tables.map((tbl) => {
                const hasItems = (bills[tbl.id] || []).length > 0;
                const isSel = selectedTable === tbl.id;
                return (
                  <button
                    key={tbl.id}
                    onClick={() => setSelectedTable(tbl.id)}
                    className={`relative px-5 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                      isSel
                        ? "bg-amber-500 border-amber-500 text-white shadow-lg scale-105"
                        : hasItems
                        ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {tbl.name}
                    {hasItems && (
                      <span
                        className={`absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          isSel ? "bg-white text-amber-600" : "bg-amber-500 text-white"
                        }`}
                      >
                        {(bills[tbl.id] || []).reduce((a, l) => a + l.quantity, 0)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {(selectedTable === "PARCEL" || paymentMethod === "Udhaar") && (
              <div className="mt-3 max-w-sm">
                <input
                  type="text"
                  placeholder={paymentMethod === "Udhaar" ? "Customer Name (Required for Udhaar)" : "Customer Name (Optional)"}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={`w-full border-2 focus:ring-2 rounded-lg px-4 py-2 text-sm outline-none transition-all ${
                    paymentMethod === "Udhaar" && !customerName.trim()
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-emerald-200 focus:border-emerald-500 focus:ring-emerald-200"
                  }`}
                />
              </div>
            )}
          </div>

          <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-7xl w-full mx-auto print:hidden pb-24 lg:pb-4">
            <section className="lg:w-2/3 flex flex-col gap-4">
              {/* Fast Items */}
              {fastItems.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-amber-600 flex items-center gap-1 uppercase tracking-wide mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    Fast Items (Quick Add)
                  </h2>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {fastItems.map((item) => (
                      <button
                        key={`fast-${item.id}`}
                        onClick={() => addItem(item)}
                        disabled={!selectedTable}
                        className="whitespace-nowrap px-4 py-2 rounded-lg font-bold text-sm border-2 border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                      >
                        {item.name} <span className="opacity-70 text-xs font-mono">({CURRENCY} {item.price})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category selector */}
              {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-lg font-bold text-sm border-2 transition-colors ${
                        selectedCategory === c.id
                          ? "bg-slate-800 border-slate-800 text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                {selectedTable ? `Add Items to ${currentTableName}` : "Select a table first"}
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {itemsToShow.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    disabled={!selectedTable}
                    className="bg-white border-2 border-slate-200 hover:border-amber-400 hover:shadow-md disabled:opacity-50 disabled:hover:border-slate-200 disabled:cursor-not-allowed rounded-2xl p-4 text-left transition-all active:scale-95 flex flex-col justify-between h-32"
                  >
                    <div>
                      <div className="font-bold text-base text-slate-800 line-clamp-2">{item.name}</div>
                      <div className="text-amber-600 font-bold font-mono mt-1">
                        {CURRENCY} {item.price.toFixed(2)}
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-end">
                      <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </span>
                    </div>
                  </button>
                ))}
                
                {itemsToShow.length === 0 && selectedCategory && (
                  <div className="col-span-full py-8 text-center text-slate-400 font-medium">
                    No items found in this category.
                  </div>
                )}
                {categories.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-400 font-medium">
                    Please go to Admin to add categories and menu items.
                  </div>
                )}
              </div>
            </section>

            <section className={`lg:w-1/3 ${isMobileCartOpen ? 'fixed inset-0 z-50 bg-black/60 flex flex-col justify-end p-2 sm:p-4 pb-0' : 'hidden lg:block'}`}>
              <div className="bg-white rounded-t-3xl lg:rounded-2xl border border-slate-200 shadow-2xl lg:shadow-sm flex flex-col overflow-hidden h-[85vh] lg:h-[calc(100vh-280px)] lg:min-h-[500px] lg:sticky lg:top-4 mt-auto w-full max-w-md mx-auto lg:max-w-none">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h2 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-amber-500" />
                    Bill — {currentTableName}
                  </h2>
                  <div className="flex items-center gap-2">
                    {currentBill.length > 0 && (
                      <button
                        onClick={clearBill}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold bg-red-50 px-2 py-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                      </button>
                    )}
                    {isMobileCartOpen && (
                      <button onClick={() => setIsMobileCartOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-full w-7 h-7 flex items-center justify-center shadow-sm">
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-3 overflow-y-auto bg-slate-50">
                  {currentBill.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                      <Receipt className="w-10 h-10 mb-2 stroke-1 opacity-50" />
                      <p className="text-sm font-medium">No items yet</p>
                      <p className="text-xs mt-1">Tap an item on the left to add it</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentBill.map((line) => (
                        <div key={line.id} className="flex flex-col bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold text-sm text-slate-800 pr-2">{line.name}</div>
                            <div className="font-bold font-mono text-sm text-slate-800 whitespace-nowrap">
                              {CURRENCY} {(line.price * line.quantity).toFixed(2)}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-slate-500 font-mono">
                              {CURRENCY} {line.price.toFixed(2)} each
                            </div>
                            
                            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                              <button
                                onClick={() => changeQty(line.id, -1)}
                                className="w-7 h-7 rounded-md bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-600"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-bold text-sm text-slate-700">{line.quantity}</span>
                              <button
                                onClick={() => changeQty(line.id, 1)}
                                className="w-7 h-7 rounded-md bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-600"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 p-4 space-y-1.5 text-sm bg-white">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono">
                      {CURRENCY} {subtotal.toFixed(2)}
                    </span>
                  </div>
                  {TAX_RATE > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax ({TAX_RATE}%)</span>
                      <span className="font-mono">
                        {CURRENCY} {taxAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-100 mt-1">
                    <span className="font-bold text-base text-slate-800">TOTAL</span>
                    <span className="font-extrabold font-mono text-2xl text-amber-600">
                      {CURRENCY} {total.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Payment Method Selector */}
                  <div className="pt-3 pb-1 border-t border-slate-100 mt-2">
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Payment Method</span>
                    <div className="grid grid-cols-3 gap-2">
                      {["Cash", "UPI", "Udhaar"].map((pm) => (
                        <button
                          key={pm}
                          onClick={() => setPaymentMethod(pm as any)}
                          className={`py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                            paymentMethod === pm
                              ? pm === "Udhaar"
                                ? "bg-red-50 border-red-500 text-red-700"
                                : "bg-slate-800 border-slate-800 text-white"
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          {pm}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 space-y-2 bg-white border-t border-slate-100 mt-auto">
                  <button
                    onClick={() => setShowPreviewModal(true)}
                    disabled={currentBill.length === 0}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors mb-2"
                  >
                    <Eye className="w-4 h-4" /> Preview Receipt
                  </button>

                  <button
                    onClick={makeBill}
                    disabled={currentBill.length === 0 || isPrinting || (paymentMethod === "Udhaar" && !customerName.trim())}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    {isPrinting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                    {isPrinting ? "Printing..." : (paymentMethod === "Udhaar" && !customerName.trim() ? "Enter Name for Udhaar" : "Make Bill & Print Instant")}
                  </button>

                  <button
                    onClick={browserPrint}
                    disabled={currentBill.length === 0 || (paymentMethod === "Udhaar" && !customerName.trim())}
                    className="w-full bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 font-bold py-3 border-2 border-slate-200 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Printer className="w-4 h-4" /> Print (Browser Dialog)
                  </button>
                </div>
              </div>
            </section>
          </main>

          {/* Mobile Bottom Sticky Cart Summary */}
          {!isMobileCartOpen && tab === "billing" && selectedTable && currentBill.length > 0 && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-40 print:hidden pb-safe">
              <div className="flex items-center justify-between max-w-md mx-auto gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Total ({currentBill.reduce((a, l) => a + l.quantity, 0)} items)</div>
                  <div className="font-black text-xl text-slate-800 font-mono">{CURRENCY} {total.toFixed(2)}</div>
                </div>
                <button
                  onClick={() => setIsMobileCartOpen(true)}
                  className="bg-amber-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
                >
                  View Cart <Receipt className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Receipt Preview Modal */}
          {showPreviewModal && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
              <div className="bg-slate-100 rounded-3xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] shadow-2xl relative">
                <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between z-10 sticky top-0">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-amber-500" /> Receipt Preview
                  </h3>
                  <button onClick={() => setShowPreviewModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full font-bold">
                    &times;
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-200/50">
                  <div className="shadow-lg">
                    <PrintableReceipt {...currentBillData} />
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-white border-t border-slate-200 space-y-2 z-10 sticky bottom-0">
                  <button
                    onClick={() => { setShowPreviewModal(false); makeBill(); }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                  >
                    <Printer className="w-5 h-5" /> Print Instantly
                  </button>
                  <button
                    onClick={() => { setShowPreviewModal(false); browserPrint(); }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Printer className="w-4 h-4" /> Print (Browser Dialog)
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= ABOUT US / SETTINGS TAB ================= */}
      {tab === "about" && isAdmin && (
        <main className="flex-1 p-4 max-w-5xl w-full mx-auto print:hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Form */}
            <form onSubmit={saveSettings} className="space-y-5">
              {/* Restaurant details */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                <h2 className="font-bold text-base flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
                  <Store className="w-5 h-5 text-amber-500" /> Restaurant Details (top of bill)
                </h2>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Restaurant Name</label>
                  <input
                    value={form.restaurantName}
                    onChange={(e) => setField("restaurantName", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tagline</label>
                  <input
                    value={form.tagline}
                    onChange={(e) => setField("tagline", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Phone</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Currency</label>
                    <input
                      value={form.currency}
                      onChange={(e) => setField("currency", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Tax %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.taxRate}
                      onChange={(e) => setField("taxRate", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* UPI Payment QR */}
              <div className="bg-white rounded-2xl border-2 border-emerald-300 shadow-sm p-5 space-y-3">
                <h2 className="font-bold text-base flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
                  <QrCode className="w-5 h-5 text-emerald-500" /> UPI Payment QR (amount auto-fills)
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your <b>UPI ID / VPA</b> (e.g. <span className="font-mono">mahankalfoodpark@okhdfcbank</span>).
                  A QR code is printed on every bill. When a customer scans it, their UPI app
                  (GPay, PhonePe, Paytm, BHIM) opens with your ID pre-filled and the <b>amount automatically
                  set to that bill's total</b> — they only enter their PIN. Leave empty to hide the QR.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">UPI ID / VPA</label>
                  <input
                    value={form.upiId}
                    onChange={(e) => setField("upiId", e.target.value)}
                    placeholder="yourname@bank"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {form.upiId.trim() !== "" && (
                  <p className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 break-all">
                    upi://pay?pa={form.upiId.trim()}&pn={form.restaurantName}&am=&lt;bill total&gt;&cu=INR
                  </p>
                )}
              </div>

              {/* ABOUT US — prints at bottom */}
              <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-sm p-5 space-y-3">
                <h2 className="font-bold text-base flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
                  <Receipt className="w-5 h-5 text-amber-500" /> About Us — printed at BOTTOM of bill
                </h2>
                <p className="text-xs text-slate-500">
                  Write anything you want printed at the bottom of every bill: opening hours, social media,
                  delivery number, party booking info, etc. Press Enter for a new line.
                </p>
                <textarea
                  value={form.aboutUs}
                  onChange={(e) => setField("aboutUs", e.target.value)}
                  rows={9}
                  placeholder={"ABOUT US\nMahankal Food Park...\nOpen Daily: 10 AM - 11 PM\nBookings: 98XXXXXXXX"}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:border-amber-500 resize-y"
                />

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Final Thank-You Line (very last line)
                  </label>
                  <input
                    value={form.footerText}
                    onChange={(e) => setField("footerText", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                {saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {saving ? "Saving..." : saved ? "Saved!" : "Save Details"}
              </button>
            </form>

            {/* Live preview */}
            <div className="lg:sticky lg:top-4">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> Live Bill Preview
              </h2>
              <div className="bg-slate-200 rounded-2xl p-4 flex justify-center overflow-x-auto">
                <PrintableReceipt {...previewData} />
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Hidden print area */}
      <div id="thermal-print-section" className="hidden print:block">
        {printData && <PrintableReceipt {...printData} />}
      </div>
    </div>
  );
}
