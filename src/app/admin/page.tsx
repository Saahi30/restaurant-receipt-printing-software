"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Save, Plus, Trash2, ArrowLeft, RefreshCw, CheckCircle2, FileText, Database, Printer, Calendar, PrinterIcon, UtensilsCrossed, IndianRupee, XCircle } from "lucide-react";
import Link from "next/link";
import { PrintableReceipt } from "@/components/PrintableReceipt";
import { UserAvatar } from "@/components/UserAvatar";
import { useTranslation } from "@/lib/i18n";
import { localizedName } from "@/lib/localized-name";

interface Table {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  nameHi?: string;
}

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  nameHi?: string;
  price: number;
  isFavorite?: boolean;
}

interface User {
  id: string;
  username: string;
  password?: string;
  role: "admin" | "owner" | "waiter" | "laptop";
  avatar?: string;
}

export default function AdminPage() {
  const { t, lang, toggleLang } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [drawer, setDrawer] = useState<{ "500": number, "200": number, "100": number, "50": number, "20": number, "10": number }>({
    "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0
  });
  const [expenses, setExpenses] = useState<{id: string, description: string, amount: number, timestamp: string}[]>([]);
  
  const [newExpenseDesc, setNewExpenseDesc] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [tab, setTab] = useState<"manage" | "reports" | "queue">("reports");
  
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "custom">("today");
  const [customFrom, setCustomFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));
  
  const [reprintData, setReprintData] = useState<any>(null);
  const [printJobs, setPrintJobs] = useState<any[]>([]);
  const [printStation, setPrintStation] = useState<{
    online: boolean;
    printerConnected: boolean;
    isReady: boolean;
    lastSeen: string | null;
  } | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueBusyId, setQueueBusyId] = useState<string | null>(null);

  useEffect(() => {
    // Check auth
    const savedSession = localStorage.getItem("pos_session");
    if (savedSession) {
      try {
        const user = JSON.parse(savedSession);
        if (user.role === "admin") {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setIsAuthorized(true);
        } else {
          window.location.href = "/";
          return;
        }
      } catch(e) {}
    } else {
      window.location.href = "/";
      return;
    }

    const load = async () => {
      try {
        const [resAdmin, resBills] = await Promise.all([
          fetch("/api/admin-data").catch(() => null),
          fetch("/api/bills").catch(() => null)
        ]);

        if (resAdmin && resAdmin.ok) {
          const json = await resAdmin.json();
          setTables(json.tables || []);
          setCategories(json.categories || []);
          setMenuItems(json.menuItems || []);
          setUsers(json.users || []);
          if (json.drawer) setDrawer(json.drawer);
          if (json.expenses) setExpenses(json.expenses);
        }

        if (resBills && resBills.ok) {
          const json = await resBills.json();
          setBills(json.bills || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveAll = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables, categories, menuItems, users, drawer, expenses }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  const loadPrintQueue = async () => {
    setQueueLoading(true);
    try {
      const res = await fetch("/api/print-jobs?all=1");
      if (res.ok) {
        const json = await res.json();
        setPrintJobs(json.jobs || []);
        setPrintStation(json.station || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "queue" || !isAuthorized) return;
    loadPrintQueue();
    const id = setInterval(loadPrintQueue, 4000);
    return () => clearInterval(id);
  }, [tab, isAuthorized]);

  const queueAction = async (jobId: string, action: "cancel" | "retry") => {
    setQueueBusyId(jobId);
    try {
      const res = await fetch("/api/print-jobs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId, action }),
      });
      if (res.ok) await loadPrintQueue();
    } finally {
      setQueueBusyId(null);
    }
  };

  // --- Tables ---
  const addTable = () => {
    setTables([...tables, { id: Date.now().toString(), name: "New Table" }]);
  };
  const updateTable = (id: string, name: string) => {
    setTables(tables.map((t) => (t.id === id ? { ...t, name } : t)));
  };
  const deleteTable = (id: string) => {
    setTables(tables.filter((t) => t.id !== id));
  };

  // --- Categories ---
  const addCategory = () => {
    setCategories([...categories, { id: Date.now().toString(), name: "New Category", nameHi: "" }]);
  };
  const updateCategory = (id: string, field: "name" | "nameHi", value: string) => {
    setCategories(categories.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };
  const deleteCategory = (id: string) => {
    setCategories(categories.filter((c) => c.id !== id));
    // Optionally delete all items in this category
    setMenuItems(menuItems.filter((m) => m.categoryId !== id));
  };

  // --- Menu Items ---
  const addMenuItem = () => {
    const firstCat = categories.length > 0 ? categories[0].id : "";
    setMenuItems([
      ...menuItems,
      { id: Date.now().toString(), categoryId: firstCat, name: "New Item", nameHi: "", price: 0, isFavorite: false },
    ]);
  };
  const updateMenuItem = (id: string, field: keyof MenuItem, value: any) => {
    setMenuItems(menuItems.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };
  const deleteMenuItem = (id: string) => {
    setMenuItems(menuItems.filter((m) => m.id !== id));
  };
  const toggleFavorite = (id: string) => {
    setMenuItems(menuItems.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m)));
  };

  // --- Users ---
  const addUser = () => {
    setUsers([...users, { id: Date.now().toString(), username: "NewUser", password: "", role: "waiter", avatar: "" }]);
  };
  const updateUser = (id: string, field: keyof User, value: any) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
  };
  const deleteUser = (id: string) => {
    setUsers(users.filter((u) => u.id !== id));
  };

  const inSelectedPeriod = (iso: string | undefined) => {
    if (!iso) return dateFilter !== "custom";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();

    if (dateFilter === "today") {
      return d.toDateString() === now.toDateString();
    }
    if (dateFilter === "week") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);
      return d >= start && d <= now;
    }
    if (dateFilter === "month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    // custom
    if (!customFrom || !customTo) return true;
    const from = new Date(customFrom + "T00:00:00");
    const to = new Date(customTo + "T23:59:59.999");
    return d >= from && d <= to;
  };

  const filteredBills = useMemo(
    () => bills.filter((b) => inSelectedPeriod(b.timestamp)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bills, dateFilter, customFrom, customTo]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => inSelectedPeriod(e.timestamp)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, dateFilter, customFrom, customTo]
  );

  const pendingKhata = filteredBills
    .filter((b) => b.paymentMethod === "Udhaar")
    .reduce((acc, b) => acc + (b.totalAmount || 0), 0);
  const cashSales = filteredBills
    .filter((b) => (b.paymentMethod || "Cash") === "Cash")
    .reduce((acc, b) => acc + (b.totalAmount || 0), 0);
  const upiSales = filteredBills
    .filter((b) => b.paymentMethod === "UPI")
    .reduce((acc, b) => acc + (b.totalAmount || 0), 0);
  const totalRevenue = filteredBills
    .filter((b) => b.paymentMethod !== "Udhaar")
    .reduce((acc, b) => acc + (b.totalAmount || 0), 0);
  const grossSales = filteredBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const expectedCash = totalRevenue - totalExpenses;
  const netEarnings = totalRevenue - totalExpenses;

  const dishSales = useMemo(() => {
    type Row = { name: string; nameHi?: string; qty: number; amount: number };
    const map = new Map<string, Row>();
    for (const bill of filteredBills) {
      const items = Array.isArray(bill.items) ? bill.items : [];
      for (const item of items) {
        const name = String(item.name || "Unknown");
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const prev = map.get(name) || { name, nameHi: item.nameHi || "", qty: 0, amount: 0 };
        prev.qty += qty;
        prev.amount += price * qty;
        if (!prev.nameHi && item.nameHi) prev.nameHi = item.nameHi;
        map.set(name, prev);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount || b.qty - a.qty);
  }, [filteredBills]);

  const periodLabel =
    dateFilter === "today"
      ? t("Daily")
      : dateFilter === "week"
      ? t("Weekly")
      : dateFilter === "month"
      ? t("Monthly")
      : `${customFrom || "…"} → ${customTo || "…"}`;

  const handleAddExpense = () => {
    if (!newExpenseDesc || !newExpenseAmount) return;
    setExpenses([...expenses, {
      id: Date.now().toString(),
      description: newExpenseDesc,
      amount: parseFloat(newExpenseAmount),
      timestamp: new Date().toISOString()
    }]);
    setNewExpenseDesc("");
    setNewExpenseAmount("");
  };

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const markAsPaid = async (orderNumber: string) => {
    try {
      const res = await fetch("/api/bills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, paymentMethod: "Cash" })
      });
      if (res.ok) {
        setBills(bills.map(b => b.orderNumber === orderNumber ? { ...b, paymentMethod: "Cash" } : b));
      }
    } catch (err) {
      console.error("Failed to mark as paid", err);
    }
  };

  const handleReprint = (bill: any) => {
    setReprintData(bill);
    setTimeout(() => {
      window.print();
      setTimeout(() => setReprintData(null), 500); // Clear after print dialog opens
    }, 150);
  };

  if (!isAuthorized || loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3 text-slate-600">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="font-semibold">{!isAuthorized ? t("Checking authorization...") : t("Loading Admin...")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-md print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-300 hover:text-white flex items-center gap-1 font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> {t("Back to POS")}
          </Link>
          <h1 className="font-bold text-lg leading-tight text-amber-500">{t("Admin Dashboard")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleLang} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded">
            {lang === "en" ? "Aअ" : "EN"}
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all"
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? t("Saving...") : saved ? t("Saved!") : t("Save Changes")}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-4 print:hidden">
        <div className="flex bg-slate-200 rounded-lg p-1 w-fit flex-wrap">
          <button
            onClick={() => setTab("reports")}
            className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
              tab === "reports" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="w-4 h-4" /> Sales & Reports
          </button>
          <button
            onClick={() => setTab("queue")}
            className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
              tab === "queue" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Printer className="w-4 h-4" /> {t("Print Queue")}
            {printJobs.filter((j) => j.status === "pending" || j.status === "printing").length > 0 && (
              <span className="ml-0.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {printJobs.filter((j) => j.status === "pending" || j.status === "printing").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("manage")}
            className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
              tab === "manage" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Database className="w-4 h-4" /> Manage Data
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        {tab === "queue" && (
          <div className="space-y-4 print:hidden">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 pb-3">
                <div>
                  <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <Printer className="w-5 h-5 text-amber-500" />
                    {t("Print Queue")}
                  </h2>
                  <p className="text-sm text-slate-500">{t("Jobs sent to the laptop print station")}</p>
                </div>
                <button
                  type="button"
                  onClick={loadPrintQueue}
                  disabled={queueLoading}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-4 h-4 ${queueLoading ? "animate-spin" : ""}`} />
                  {t("Refresh")}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    {t("Laptop station")}
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      printStation?.online ? "text-emerald-700" : "text-slate-500"
                    }`}
                  >
                    {printStation?.online ? t("Online") : t("Offline")}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    {t("USB printer")}
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      printStation?.printerConnected ? "text-emerald-700" : "text-slate-500"
                    }`}
                  >
                    {printStation?.printerConnected ? t("Connected") : t("Not connected")}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    {t("Ready to print")}
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      printStation?.isReady ? "text-emerald-700" : "text-amber-600"
                    }`}
                  >
                    {printStation?.isReady ? t("Yes") : t("No")}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="p-3 font-bold">{t("Time")}</th>
                      <th className="p-3 font-bold">{t("Table")}</th>
                      <th className="p-3 font-bold">{t("Bill No")}</th>
                      <th className="p-3 font-bold text-right">{t("Total")}</th>
                      <th className="p-3 font-bold">{t("Status")}</th>
                      <th className="p-3 font-bold text-right">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printJobs.map((job) => {
                      const receipt = job.receipt || {};
                      const status = String(job.status || "");
                      const statusClass =
                        status === "done"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : status === "pending" || status === "printing"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : status === "failed"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-slate-100 text-slate-600 border-slate-200";
                      return (
                        <tr key={job.id} className="border-t border-slate-100 align-top">
                          <td className="p-3 text-xs text-slate-600 whitespace-nowrap">
                            {job.created_at
                              ? new Date(job.created_at).toLocaleString()
                              : "—"}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            {receipt.tableNumber || job.table_id || "—"}
                          </td>
                          <td className="p-3 font-mono text-xs text-slate-700">
                            {receipt.orderNumber || "—"}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">
                            Rs. {Number(receipt.totalAmount || 0).toFixed(0)}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border capitalize ${statusClass}`}
                            >
                              {status || "—"}
                            </span>
                            {job.error && (
                              <div className="text-[11px] text-red-600 mt-1 max-w-[180px] truncate" title={job.error}>
                                {job.error}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            {(status === "pending" || status === "printing") && (
                              <button
                                type="button"
                                disabled={queueBusyId === job.id}
                                onClick={() => queueAction(job.id, "cancel")}
                                className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 px-2 py-1 rounded-md disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                {t("Cancel")}
                              </button>
                            )}
                            {(status === "failed" || status === "cancelled" || status === "done") && (
                              <button
                                type="button"
                                disabled={queueBusyId === job.id}
                                onClick={() => queueAction(job.id, "retry")}
                                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 px-2 py-1 rounded-md disabled:opacity-50"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                {t("Retry")}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {printJobs.length === 0 && !queueLoading && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                          {t("No print jobs yet.")}
                        </td>
                      </tr>
                    )}
                    {queueLoading && printJobs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                          {t("Loading...")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
        {tab === "manage" && (
          <div className="space-y-6 print:hidden">
            {/* Tables Section */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-bold text-lg text-slate-800">{t("Tables")}</h2>
            <button
              onClick={addTable}
              className="text-amber-600 hover:text-amber-700 font-semibold text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Table
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tables.map((tbl) => (
              <div key={tbl.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                <input
                  value={tbl.name}
                  onChange={(e) => updateTable(tbl.id, e.target.value)}
                  className="w-full bg-transparent border-none outline-none font-semibold text-sm"
                  placeholder={t("Table Name")}
                />
                <button onClick={() => deleteTable(tbl.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {tables.length === 0 && <p className="text-sm text-slate-500 col-span-full">No tables added yet.</p>}
          </div>
        </section>

        {/* Categories Section */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-bold text-lg text-slate-800">{t("Menu Categories")}</h2>
            <button
              onClick={addCategory}
              className="text-amber-600 hover:text-amber-700 font-semibold text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div key={c.id} className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <input
                    value={c.name}
                    onChange={(e) => updateCategory(c.id, "name", e.target.value)}
                    className="w-full bg-transparent border-none outline-none font-semibold text-sm"
                    placeholder="English name"
                  />
                  <button onClick={() => deleteCategory(c.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <input
                  value={c.nameHi || ""}
                  onChange={(e) => updateCategory(c.id, "nameHi", e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none text-sm"
                  placeholder="हिंदी नाम"
                />
              </div>
            ))}
            {categories.length === 0 && <p className="text-sm text-slate-500 col-span-full">No categories added yet.</p>}
          </div>
        </section>

        {/* Menu Items Section */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-bold text-lg text-slate-800">Menu Items</h2>
            <button
              onClick={addMenuItem}
              className="text-amber-600 hover:text-amber-700 font-semibold text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
          <div className="space-y-3">
            {menuItems.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex-1 flex flex-col gap-1.5 w-full">
                  <input
                    value={m.name}
                    onChange={(e) => updateMenuItem(m.id, "name", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none text-sm font-semibold"
                    placeholder="English name"
                  />
                  <input
                    value={m.nameHi || ""}
                    onChange={(e) => updateMenuItem(m.id, "nameHi", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none text-sm"
                    placeholder="हिंदी नाम"
                  />
                </div>
                <select
                  value={m.categoryId}
                  onChange={(e) => updateMenuItem(m.id, "categoryId", e.target.value)}
                  className="w-full sm:w-1/3 bg-white border border-slate-200 rounded px-2 py-1 outline-none text-sm"
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.nameHi ? ` / ${c.nameHi}` : ""}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-sm font-bold text-slate-500">Price:</span>
                  <input
                    type="number"
                    value={m.price}
                    onChange={(e) => updateMenuItem(m.id, "price", parseFloat(e.target.value) || 0)}
                    className="w-24 bg-white border border-slate-200 rounded px-2 py-1 outline-none text-sm font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button 
                    onClick={() => toggleFavorite(m.id)} 
                    className={`p-1.5 rounded-md transition-colors ${m.isFavorite ? "text-amber-500 bg-amber-50 hover:bg-amber-100" : "text-slate-400 hover:bg-slate-200"}`}
                    title={m.isFavorite ? t("Remove from Fast Items") : t("Add to Fast Items")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={m.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </button>
                  <button onClick={() => deleteMenuItem(m.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {menuItems.length === 0 && <p className="text-sm text-slate-500">{t("No menu items added yet.")}</p>}
          </div>
        </section>

        {/* Users Section */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-bold text-lg text-slate-800">{t("User Management")}</h2>
            <button
              onClick={addUser}
              className="text-amber-600 hover:text-amber-700 font-semibold text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> {t("Add User")}
            </button>
          </div>
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <UserAvatar
                  name={u.username}
                  avatar={u.avatar}
                  size="md"
                  editable
                  onChange={(dataUrl) => updateUser(u.id, "avatar", dataUrl)}
                />
                <input
                  value={u.username}
                  onChange={(e) => updateUser(u.id, "username", e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 outline-none text-sm font-semibold"
                  placeholder={t("Username")}
                />
                <input
                  value={u.password || ""}
                  onChange={(e) => updateUser(u.id, "password", e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 outline-none text-sm"
                  placeholder={u.role === "admin" || u.role === "laptop" ? t("Password") : t("Password (admin/laptop only)")}
                  type="text"
                  disabled={u.role !== "admin" && u.role !== "laptop"}
                />
                <select
                  value={u.role}
                  onChange={(e) => updateUser(u.id, "role", e.target.value)}
                  className="w-full sm:w-1/4 bg-white border border-slate-200 rounded px-2 py-1 outline-none text-sm font-semibold"
                >
                  <option value="admin">{t("Admin")}</option>
                  <option value="owner">{t("Owner")}</option>
                  <option value="waiter">{t("Waiter")}</option>
                  <option value="laptop">{t("Laptop")}</option>
                </select>
                <button 
                  onClick={() => deleteUser(u.id)} 
                  disabled={users.filter((x) => x.role === "admin").length <= 1 && u.role === "admin"}
                  className="text-red-500 hover:text-red-700 w-full sm:w-auto text-right disabled:opacity-30 disabled:cursor-not-allowed"
                  title={u.role === "admin" ? t("Cannot delete the last admin") : t("Delete user")}
                >
                  <Trash2 className="w-4 h-4 inline" />
                </button>
              </div>
            ))}
            {users.length === 0 && <p className="text-sm text-slate-500">{t("No users added yet.")}</p>}
            <p className="text-xs text-slate-500">
              {t("Owner: bills + past bills. Laptop: print station (password 8855). Only Admin opens full Admin.")}
            </p>
          </div>
        </section>
          </div>
        )}
        {tab === "reports" && (
          <div className="space-y-6 print:block">
            <div className="flex flex-col gap-3 print:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap bg-white border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
                  {([
                    ["today", t("Daily")],
                    ["week", t("Weekly")],
                    ["month", t("Monthly")],
                    ["custom", t("Custom")],
                  ] as const).map(([filter, label]) => (
                    <button
                      key={filter}
                      onClick={() => setDateFilter(filter)}
                      className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                        dateFilter === filter
                          ? "bg-slate-800 text-white shadow"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setReprintData(null);
                    setTimeout(() => window.print(), 50);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Printer className="w-4 h-4" /> {t("Print Report")}
                </button>
              </div>

              {dateFilter === "custom" && (
                <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t("From")}</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                  />
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t("To")}</label>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                  />
                </div>
              )}
            </div>

            {reprintData ? (
              <div id="thermal-print-section" className="hidden print:block">
                <PrintableReceipt {...reprintData} />
              </div>
            ) : (
              <div id="thermal-print-section" className="hidden print:block mb-6 text-center">
                <h2 className="text-xl font-bold">Sales & Expense Report</h2>
                <p className="text-sm">
                  Period: {periodLabel} | Generated: {new Date().toLocaleString()}
                </p>
              </div>
            )}

            {/* Earnings summary */}
            <div className={`${reprintData ? "print:hidden" : ""}`}>
              <div className="flex items-center gap-2 mb-3">
                <IndianRupee className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-lg text-slate-800">{t("Earnings")}</h2>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide ml-1">
                  ({periodLabel})
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {t("Gross Sales")}
                  </div>
                  <div className="text-xl font-black text-slate-900 font-mono">Rs. {grossSales.toFixed(0)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {t("Collected")}
                  </div>
                  <div className="text-xl font-black text-amber-600 font-mono">Rs. {totalRevenue.toFixed(0)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("Cash")}</div>
                  <div className="text-xl font-black text-slate-800 font-mono">Rs. {cashSales.toFixed(0)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">UPI</div>
                  <div className="text-xl font-black text-slate-800 font-mono">Rs. {upiSales.toFixed(0)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-sm bg-red-50/40">
                  <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-1">
                    {t("Pending Khata")}
                  </div>
                  <div className="text-xl font-black text-red-600 font-mono">Rs. {pendingKhata.toFixed(0)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm bg-emerald-50/40">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                    {t("Net Earnings")}
                  </div>
                  <div className="text-xl font-black text-emerald-700 font-mono">Rs. {netEarnings.toFixed(0)}</div>
                  <div className="text-[10px] text-emerald-600/80 mt-0.5">
                    {filteredBills.length} {t("bills")} · Rs. {totalExpenses.toFixed(0)} {t("expenses")}
                  </div>
                </div>
              </div>
            </div>

            {/* Dish-wise breakdown */}
            <section className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${reprintData ? "print:hidden" : ""}`}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-lg text-slate-800">{t("Dish-wise Sales")}</h2>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {dishSales.length} {t("dishes")}
                </span>
              </div>
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left border-collapse min-w-[480px]">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="p-3 w-10">#</th>
                      <th className="p-3">{t("Dish")}</th>
                      <th className="p-3 text-right">{t("Qty Sold")}</th>
                      <th className="p-3 text-right">{t("Amount")} (Rs.)</th>
                      <th className="p-3 text-right hidden sm:table-cell">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dishSales.map((row, i) => {
                      const pct = grossSales > 0 ? (row.amount / grossSales) * 100 : 0;
                      return (
                        <tr key={row.name} className="hover:bg-slate-50/80">
                          <td className="p-3 text-xs text-slate-400 font-mono">{i + 1}</td>
                          <td className="p-3 text-sm font-semibold text-slate-800">
                            {localizedName(row, lang)}
                            {lang === "hi" && row.nameHi ? (
                              <div className="text-[10px] font-normal text-slate-400">{row.name}</div>
                            ) : null}
                          </td>
                          <td className="p-3 text-sm font-bold font-mono text-right text-slate-700">{row.qty}</td>
                          <td className="p-3 text-sm font-black font-mono text-right text-amber-600">
                            {row.amount.toFixed(2)}
                          </td>
                          <td className="p-3 text-xs font-mono text-right text-slate-400 hidden sm:table-cell">
                            {pct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                    {dishSales.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-medium text-sm">
                          {t("No sales in this period.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {dishSales.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                        <td className="p-3" colSpan={2}>
                          {t("Total")}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {dishSales.reduce((a, r) => a + r.qty, 0)}
                        </td>
                        <td className="p-3 text-right font-mono text-amber-700">
                          {dishSales.reduce((a, r) => a + r.amount, 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right hidden sm:table-cell">100%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${reprintData ? "print:hidden" : ""}`}>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-center items-center">
                <span className="text-slate-500 font-semibold text-sm mb-1 uppercase tracking-wider text-center">
                  {t("Expected Cash")}
                </span>
                <span className="text-2xl font-black text-emerald-600 font-mono">Rs. {expectedCash.toFixed(2)}</span>
                <span className="text-xs text-slate-400 mt-1">
                  {t("Collected")} − {t("expenses")}
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-center items-center">
                <span className="text-slate-500 font-semibold text-sm mb-1 uppercase tracking-wider text-center">
                  {t("Total Bills")}
                </span>
                <span className="text-2xl font-black text-slate-800 font-mono">{filteredBills.length}</span>
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 items-start ${reprintData ? 'print:hidden' : ''}`}>
              {/* Cash Drawer Calculator */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💵</span>
                  <h2 className="font-bold text-lg text-emerald-800">Cash Drawer Calculator</h2>
                </div>
                <button
                   onClick={saveAll}
                   disabled={saving}
                   className="text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg font-semibold text-sm hover:bg-emerald-200 transition-colors flex items-center gap-1"
                >
                   {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                   {saving ? t("Saving...") : saved ? t("Saved!") : t("Save Drawer")}
                </button>
              </div>
              <div className="p-5 flex flex-col md:flex-row gap-8">
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {(["500", "200", "100", "50", "20", "10"] as const).map((note) => (
                    <div key={note} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400 transition-all">
                      <span className="font-semibold text-slate-600 w-12 text-right">₹{note}</span>
                      <span className="text-slate-300 font-bold text-sm">x</span>
                      <input
                        type="number"
                        min="0"
                        value={drawer[note] === 0 ? "" : drawer[note]}
                        onChange={(e) => setDrawer({ ...drawer, [note]: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 outline-none text-base font-mono font-bold text-emerald-700 text-right"
                      />
                    </div>
                  ))}
                </div>
                
                <div className="w-full md:w-64 bg-emerald-50/50 rounded-xl border border-emerald-100 p-5 flex flex-col justify-center items-center">
                  <span className="text-emerald-600 font-semibold text-sm mb-1 uppercase tracking-wider">Drawer Total</span>
                  <span className="text-3xl font-black text-emerald-700 font-mono">
                    Rs. {((drawer["500"] || 0) * 500 + (drawer["200"] || 0) * 200 + (drawer["100"] || 0) * 100 + (drawer["50"] || 0) * 50 + (drawer["20"] || 0) * 20 + (drawer["10"] || 0) * 10).toFixed(2)}
                  </span>
                </div>
                </div>
              </section>

              {/* Petty Cash Expenses */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💸</span>
                    <h2 className="font-bold text-lg text-slate-800">Petty Cash Tracker</h2>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex gap-2 print:hidden">
                    <input
                      type="text"
                      placeholder={t("e.g., Milk, Vegetables...")}
                      value={newExpenseDesc}
                      onChange={(e) => setNewExpenseDesc(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                    <input
                      type="number"
                      placeholder={t("Amount")}
                      value={newExpenseAmount}
                      onChange={(e) => setNewExpenseAmount(e.target.value)}
                      className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                    <button
                      onClick={handleAddExpense}
                      disabled={!newExpenseDesc || !newExpenseAmount}
                      className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                          <th className="p-3">Description</th>
                          <th className="p-3 text-right">Amount (Rs.)</th>
                          <th className="p-3 w-10 print:hidden"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map((e, i) => (
                          <tr key={e.id || i} className="hover:bg-slate-50/50 group">
                            <td className="p-3 text-sm text-slate-700">
                              <div className="font-medium">{e.description}</div>
                              <div className="text-[10px] text-slate-400">{new Date(e.timestamp).toLocaleString()}</div>
                            </td>
                            <td className="p-3 text-sm font-bold text-slate-800 font-mono text-right text-red-500">
                              - {e.amount.toFixed(2)}
                            </td>
                            <td className="p-3 text-right print:hidden">
                              <button onClick={() => deleteExpense(e.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredExpenses.length === 0 && (
                          <tr>
                            <td colSpan={3} className="p-6 text-center text-slate-400 font-medium text-sm">
                              {t("No expenses recorded for this period.")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>

            <section className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6 ${reprintData ? 'print:hidden' : ''}`}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-lg text-slate-800">Bill History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="p-4">Date</th>
                      <th className="p-4">Bill No</th>
                      <th className="p-4">Table</th>
                      <th className="p-4">{t("Payment")}</th>
                      <th className="p-4 text-right">Total (Rs.)</th>
                      <th className="p-4 text-right">Received</th>
                      <th className="p-4 text-right">Return</th>
                      <th className="p-4 text-right print:hidden">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBills.map((b, i) => (
                      <tr key={b.id || i} className="hover:bg-slate-50/50">
                        <td className="p-4 text-sm text-slate-600">
                          {b.timestamp ? new Date(b.timestamp).toLocaleString() : b.date}
                        </td>
                        <td className="p-4 text-sm font-medium text-slate-800">{b.orderNumber}</td>
                        <td className="p-4 text-sm text-slate-600">
                          {b.tableNumber}
                          {b.customerName && <div className="text-xs text-slate-400">{b.customerName}</div>}
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {b.paymentMethod === "Udhaar" ? (
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Udhaar</span>
                          ) : (
                            b.paymentMethod || "Cash"
                          )}
                        </td>
                        <td className="p-4 text-sm font-bold text-slate-800 font-mono text-right">
                          {b.totalAmount ? b.totalAmount.toFixed(2) : "0.00"}
                        </td>
                        <td className="p-4 text-sm font-mono text-right text-slate-600">
                          {typeof b.amountReceived === "number" ? b.amountReceived.toFixed(2) : "—"}
                        </td>
                        <td className="p-4 text-sm font-mono text-right">
                          {typeof b.changeGiven === "number" ? (
                            <span className={b.changeGiven >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                              {b.changeGiven.toFixed(2)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-4 text-right print:hidden flex justify-end gap-2">
                          {b.paymentMethod === "Udhaar" && (
                            <button
                              onClick={() => markAsPaid(b.orderNumber)}
                              className="bg-red-50 hover:bg-red-500 hover:text-white text-red-600 border border-red-200 font-semibold px-2 py-1 rounded text-xs transition-colors"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => handleReprint(b)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                          >
                            <PrinterIcon className="w-3.5 h-3.5" /> Reprint
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredBills.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-medium text-sm">
                          {t("No bills found for the selected time period.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
