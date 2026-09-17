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
  Fingerprint,
  History,
  PrinterIcon,
  Menu,
  X,
  LogOut,
  Languages,
  Mic,
} from "lucide-react";
import { PrintableReceipt, ReceiptProps } from "@/components/PrintableReceipt";
import { BrandLogo } from "@/components/BrandLogo";
import { UserAvatar } from "@/components/UserAvatar";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { localizedName } from "@/lib/localized-name";
import {
  canUseFingerprint,
  hasFingerprintRegistered,
  registerFingerprint,
  verifyFingerprint,
} from "@/lib/webauthn";
import { LaptopBoard } from "@/components/LaptopBoard";
import { printThermalSection } from "@/lib/thermal-print";
import { VoiceBillModal, type VoiceBillApproval, type VoiceBillHandle } from "@/components/VoiceBillModal";

interface User {
  id: string;
  username: string;
  password?: string;
  role: "admin" | "owner" | "waiter" | "laptop";
  avatar?: string;
}

interface BillLine {
  id: string;
  name: string;
  nameHi?: string;
  price: number;
  quantity: number;
}

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

export default function HomePage() {
  const { t, lang, toggleLang } = useTranslation();
  const [tab, setTab] = useState<"billing" | "about" | "pastBills">("billing");
  const [loading, setLoading] = useState(true);
  
  const [settings, setSettings] = useState<AppSettings>(FALLBACK);
  const [form, setForm] = useState<AppSettings>(FALLBACK);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [dataLoadError, setDataLoadError] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUserForLogin, setSelectedUserForLogin] = useState<User | null>(null);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [fingerprintAvailable, setFingerprintAvailable] = useState(false);
  const [fingerprintRegistered, setFingerprintRegistered] = useState(false);
  const [fingerprintBusy, setFingerprintBusy] = useState(false);
  const [pendingFingerprintSetup, setPendingFingerprintSetup] = useState<User | null>(null);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showVoiceBill, setShowVoiceBill] = useState(false);
  const voiceBillRef = useRef<VoiceBillHandle>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI" | "Udhaar">("Cash");
  /** Takeaway only: false = collect payment when order is handed over */
  const [paymentCollected, setPaymentCollected] = useState(true);
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [menuQtyDraft, setMenuQtyDraft] = useState<Record<string, string>>({});
  const [cartQtyDraft, setCartQtyDraft] = useState<Record<string, string>>({});
  const [pricePickerKey, setPricePickerKey] = useState<string | null>(null);
  const [miscName, setMiscName] = useState("");
  const [miscPrice, setMiscPrice] = useState("");
  const [miscQty, setMiscQty] = useState("1");
  const [sessions, setSessions] = useState<Record<string, TableSession>>({});
  const [printData, setPrintData] = useState<ReceiptProps | null>(null);
  const [pastBills, setPastBills] = useState<any[]>([]);
  const [pastBillsLoading, setPastBillsLoading] = useState(false);
  const [reprintData, setReprintData] = useState<any>(null);
  const [billStatusMsg, setBillStatusMsg] = useState("");
  const sessionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerStatus, setPrinterStatus] = useState("No printer connected");
  const [printerError, setPrinterError] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const portRef = useRef<any>(null);

  useEffect(() => {
    canUseFingerprint().then(setFingerprintAvailable).catch(() => setFingerprintAvailable(false));
  }, []);

  // ---- Load settings and data ----
  const loadAppData = async () => {
    setLoading(true);
    setDataLoadError("");
    try {
      const [resSettings, resData, resSessions] = await Promise.all([
        fetch("/api/settings").catch(() => null),
        fetch("/api/admin-data").catch(() => null),
        fetch("/api/table-sessions").catch(() => null),
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
      } else {
        setAllUsers([]);
        setDataLoadError(t("Could not load accounts"));
      }

      if (resSessions && resSessions.ok) {
        const json = await resSessions.json();
        const map: Record<string, TableSession> = {};
        for (const s of json.sessions || []) map[s.tableId] = s;
        setSessions(map);
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
      setDataLoadError(t("Could not load accounts"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadSessions = async () => {
    try {
      const res = await fetch("/api/table-sessions");
      if (!res.ok) return;
      const json = await res.json();
      const map: Record<string, TableSession> = {};
      for (const s of json.sessions || []) map[s.tableId] = s;
      setSessions(map);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!currentUser || currentUser.role === "laptop") return;
    const id = setInterval(reloadSessions, 3000);
    return () => clearInterval(id);
  }, [currentUser]);

  useEffect(() => {
    if (tab !== "billing") setShowVoiceBill(false);
  }, [tab]);

  const completePasswordLogin = (user: User) => {
    const sessionUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      avatar: user.avatar || "",
    };
    setCurrentUser(sessionUser as User);
    localStorage.setItem("pos_session", JSON.stringify(sessionUser));
    setSelectedUserForLogin(null);
    setLoginPassword("");
    setLoginError("");

    // Fingerprint setup only for admin on Android
    if (user.role === "admin" && fingerprintAvailable && !hasFingerprintRegistered(user.id)) {
      setPendingFingerprintSetup(user);
    }
  };

  const handleUserBoxClick = (user: User) => {
    setLoginError("");
    if (user.role === "admin" || user.role === "laptop") {
      setSelectedUserForLogin(user);
      setLoginUsername(user.username);
      setLoginPassword("");
      setFingerprintRegistered(user.role === "admin" && hasFingerprintRegistered(user.id));
    } else {
      const sessionUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        avatar: user.avatar || "",
      };
      setCurrentUser(sessionUser as User);
      localStorage.setItem("pos_session", JSON.stringify(sessionUser));
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const user = allUsers.find(
      (u) => u.username === loginUsername && u.password === loginPassword
    );
    if (user && (user.role === "admin" || user.role === "laptop")) {
      completePasswordLogin(user);
    } else {
      setLoginError(t("Invalid password"));
    }
  };

  const handleFingerprintLogin = async () => {
    if (!selectedUserForLogin || selectedUserForLogin.role !== "admin") return;
    setLoginError("");
    setFingerprintBusy(true);
    try {
      const ok = await verifyFingerprint(selectedUserForLogin.id);
      if (!ok) {
        setLoginError(t("Fingerprint failed. Try password."));
        return;
      }
      completePasswordLogin(selectedUserForLogin);
    } catch {
      setLoginError(t("Fingerprint failed. Try password."));
    } finally {
      setFingerprintBusy(false);
    }
  };

  const handleSetupFingerprint = async () => {
    if (!pendingFingerprintSetup) return;
    setFingerprintBusy(true);
    try {
      await registerFingerprint(pendingFingerprintSetup.id, pendingFingerprintSetup.username);
      setFingerprintRegistered(true);
      setPendingFingerprintSetup(null);
    } catch {
      setLoginError(t("Fingerprint setup failed"));
      setPendingFingerprintSetup(null);
    } finally {
      setFingerprintBusy(false);
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

  const currentSession = selectedTable ? getSession(selectedTable) : null;
  const currentBill = currentSession?.items || [];
  const currentTableObj = tables.find(t => t.id === selectedTable);
  const currentTableName = selectedTable === "PARCEL" 
    ? (customerName ? `Parcel: ${customerName}` : "Parcel (Takeaway)") 
    : (currentTableObj ? currentTableObj.name : "Unknown Table");

  const persistCart = async (tableId: string, next: TableSession, immediate = false) => {
    setSessions((prev) => ({ ...prev, [tableId]: next }));
    if (sessionSaveTimer.current) clearTimeout(sessionSaveTimer.current);
    const save = async () => {
      try {
        const res = await fetch("/api/table-sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableId,
            items: next.items,
            customerName: next.customerName,
            paymentMethod: next.paymentMethod,
            orderType: next.orderType,
            updatedBy: currentUser?.username,
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Failed to save cart");
        }
        const json = await res.json();
        if (json.session) {
          setSessions((prev) => ({ ...prev, [json.session.tableId]: json.session }));
        }
        return true;
      } catch (e: any) {
        console.error(e);
        setBillStatusMsg(e.message || "Failed to save — reloading");
        reloadSessions();
        return false;
      }
    };
    if (immediate) return save();
    sessionSaveTimer.current = setTimeout(() => {
      void save();
    }, 300);
    return true;
  };

  // Keep local payment/customer fields in sync when switching tables
  useEffect(() => {
    if (!selectedTable) return;
    const s = getSession(selectedTable);
    setCustomerName(s.customerName || "");
    if (s.paymentMethod === "Cash" || s.paymentMethod === "UPI" || s.paymentMethod === "Udhaar") {
      setPaymentMethod(s.paymentMethod);
      if (s.paymentMethod === "Udhaar") setPaymentCollected(false);
      else setPaymentCollected(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable]);

  // ---- Bill actions (persisted to Supabase) ----
  const parseQty = (raw: string | undefined, fallback = 1) => {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(n, 999);
  };

  const getMenuQty = (key: string) => parseQty(menuQtyDraft[key], 1);

  const setMenuQty = (key: string, value: string) => {
    const cleaned = value.replace(/[^\d]/g, "").slice(0, 3);
    setMenuQtyDraft((prev) => ({ ...prev, [key]: cleaned }));
  };

  const addItem = (
    item: { id: string; name: string; nameHi?: string; price: number },
    qty = 1
  ) => {
    if (!selectedTable) return;
    const addQty = Math.max(1, Math.min(Math.floor(qty) || 1, 999));
    const prev = getSession(selectedTable);
    const lines = [...prev.items];
    const idx = lines.findIndex((l) => l.id === item.id);
    if (idx > -1) lines[idx] = { ...lines[idx], quantity: lines[idx].quantity + addQty };
    else
      lines.push({
        id: item.id,
        name: item.name,
        nameHi: item.nameHi || "",
        price: item.price,
        quantity: addQty,
      });
    persistCart(selectedTable, {
      ...prev,
      items: lines,
      status: "ongoing",
      customerName,
      paymentMethod,
      receipt: null,
    });
  };

  const applyVoiceBill = async (bill: VoiceBillApproval) => {
    const tableId = bill.tableId;
    setSelectedTable(tableId);
    setPaymentMethod(bill.paymentMethod);
    setCustomerName(bill.customerName);
    if (bill.paymentMethod === "Udhaar") setPaymentCollected(false);
    else setPaymentCollected(true);
    if (bill.paymentMethod !== "Cash") setAmountReceived("");

    const prev = getSession(tableId);
    const items: BillLine[] = bill.lines.map((line) => ({
      id: line.id,
      name: line.name,
      nameHi: line.nameHi || "",
      price: line.price,
      quantity: line.quantity,
    }));
    const ok = await persistCart(
      tableId,
      {
        ...prev,
        items,
        status: items.length ? "ongoing" : "empty",
        customerName: bill.customerName,
        paymentMethod: bill.paymentMethod,
        orderType: tableId === "PARCEL" ? "Takeaway" : "Dine-In",
        receipt: null,
      },
      true
    );
    setShowVoiceBill(false);
    setIsMobileCartOpen(false);
    if (ok && items.length > 0) setShowPreviewModal(true);
  };

  const openVoiceBill = () => {
    setTab("billing");
    setNavMenuOpen(false);
    setShowVoiceBill(true);
    voiceBillRef.current?.start();
  };

  const addMiscItem = () => {
    if (!selectedTable) return;
    const name = miscName.trim();
    const price = Number(miscPrice);
    if (!name || !Number.isFinite(price) || price < 0) return;
    const qty = parseQty(miscQty, 1);
    addItem(
      {
        id: `misc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        nameHi: name,
        price,
      },
      qty
    );
    setMiscName("");
    setMiscPrice("");
    setMiscQty("1");
  };

  const changeQty = (itemId: string, delta: number) => {
    if (!selectedTable) return;
    const prev = getSession(selectedTable);
    const lines = prev.items
      .map((l) => (l.id === itemId ? { ...l, quantity: l.quantity + delta } : l))
      .filter((l) => l.quantity > 0);
    persistCart(selectedTable, {
      ...prev,
      items: lines,
      status: lines.length ? "ongoing" : "empty",
      customerName,
      paymentMethod,
      receipt: null,
    });
  };

  const setQty = (itemId: string, quantity: number) => {
    if (!selectedTable) return;
    const q = Math.floor(quantity);
    const prev = getSession(selectedTable);
    const lines =
      !Number.isFinite(q) || q <= 0
        ? prev.items.filter((l) => l.id !== itemId)
        : prev.items.map((l) =>
            l.id === itemId ? { ...l, quantity: Math.min(q, 999) } : l
          );
    persistCart(selectedTable, {
      ...prev,
      items: lines,
      status: lines.length ? "ongoing" : "empty",
      customerName,
      paymentMethod,
      receipt: null,
    });
  };

  const clearBill = () => {
    if (!selectedTable) return;
    const prev = getSession(selectedTable);
    persistCart(selectedTable, {
      ...prev,
      items: [],
      status: "empty",
      customerName: selectedTable === "PARCEL" ? "" : prev.customerName,
      paymentMethod,
      receipt: null,
    });
    setAmountReceived("");
    if (selectedTable === "PARCEL") setCustomerName("");
  };

  const subtotal = currentBill.reduce((a, l) => a + l.price * l.quantity, 0);
  const taxAmount = (subtotal * TAX_RATE) / 100;
  const total = subtotal + taxAmount;
  const amountReceivedNum = parseFloat(amountReceived);
  const hasAmountReceived = amountReceived.trim() !== "" && !Number.isNaN(amountReceivedNum);
  const changeReturn = hasAmountReceived ? amountReceivedNum - total : null;

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

  /** Send ESC @ to stop runaway blank paper feed. */
  const stopPrinter = async () => {
    if (!portRef.current) return;
    try {
      const writer = portRef.current.writable.getWriter();
      await writer.write(new Uint8Array([0x1b, 0x40])); // ESC @
      writer.releaseLock();
      setPrinterStatus("Printer reset — ready");
      setPrinterError("");
      setIsPrinting(false);
    } catch (err: any) {
      setPrinterError(err?.message || "Could not stop printer. Open cover or power off.");
    }
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
      // eslint-disable-next-line react-hooks/purity
      orderNumber: `BILL-${Date.now().toString().slice(-6)}`,
      tableNumber: tableName,
      orderType: tableName.startsWith("Parcel") ? "Takeaway" : "Dine-In",
      // eslint-disable-next-line react-hooks/purity
      date: new Date().toLocaleString(),
      items: lines.map((l) => ({
        name: l.name,
        nameHi: l.nameHi,
        price: l.price,
        quantity: l.quantity,
      })),
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
      lang,
    };
  };

  /** Tender/change is logged for the biller only — never sent to print. */
  const buildBillLogPayload = (data: ReceiptProps) => {
    if (!hasAmountReceived) return data;
    return {
      ...data,
      amountReceived: Math.round(amountReceivedNum * 100) / 100,
      changeGiven: Math.round((amountReceivedNum - data.totalAmount) * 100) / 100,
    };
  };

  const writeEscPos = async (bytes: number[]) => {
    if (!portRef.current) throw new Error("Printer not connected");
    const writer = portRef.current.writable.getWriter();
    try {
      await writer.write(new Uint8Array(bytes));
    } finally {
      writer.releaseLock();
    }
  };

  const fetchEscPosBytes = async (type: "receipt" | "token" | "kot", data: Record<string, unknown>) => {
    const res = await fetch("/api/escpos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data }),
    });
    const json = await res.json();
    if (!json.success || !json.bytes) throw new Error(json.error || "ESC/POS failed");
    return json.bytes as number[];
  };

  const toEscPosReceipt = (data: ReceiptProps) => ({
    ...data,
    items: data.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      notes: item.notes,
    })),
  });

  const printLocally = async (data: ReceiptProps, tokenSlip?: ReceiptProps | null) => {
    // Prefer USB ESC/POS when connected; otherwise browser print (any device).
    if (printerConnected && portRef.current) {
      setPrinterStatus(t("Printing..."));
      // Token and bill are separate print jobs with a full cut between them.
      if (tokenSlip?.tokenNumber) {
        const tokenBytes = await fetchEscPosBytes("token", {
          restaurantName: tokenSlip.restaurantName,
          tokenNumber: tokenSlip.tokenNumber,
          orderNumber: tokenSlip.orderNumber,
          date: tokenSlip.date,
          totalAmount: tokenSlip.totalAmount,
          currency: tokenSlip.currency,
          paymentCollected: tokenSlip.paymentCollected,
          customerName: tokenSlip.customerName,
          paperWidth: tokenSlip.paperWidth || "80mm",
        });
        await writeEscPos(tokenBytes);
        // Wait for cutter to finish before sending kitchen bill
        await new Promise((r) => setTimeout(r, 1200));
      }
      const billBytes = await fetchEscPosBytes("receipt", toEscPosReceipt(data));
      await writeEscPos(billBytes);
      setPrinterStatus(t("Printed! Printer connected & ready"));
      return;
    }

    // No local USB printer (e.g. on a phone): push the bill to the laptop print
    // station queue so it prints silently there — never open this device's print dialog.
    const enqueueRes = await fetch("/api/print-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId: selectedTable,
        receipt: data,
      }),
    });
    if (!enqueueRes.ok) {
      const err = await enqueueRes.json().catch(() => ({}));
      throw new Error(err.error || t("Could not send to printer station"));
    }
    setPrinterStatus(t("Sent to printer station"));
  };

  const makeBill = async () => {
    if (currentBill.length === 0 || !selectedTable) return;
    if (sessionSaveTimer.current) clearTimeout(sessionSaveTimer.current);
    setPrinterError("");
    setBillStatusMsg("");
    setIsPrinting(true);
    try {
      const isTakeaway = selectedTable === "PARCEL";
      const collected = isTakeaway
        ? paymentMethod === "Udhaar"
          ? false
          : paymentCollected
        : true;

      let data = buildReceiptData(settings, currentBill, currentTableName);
      data = { ...data, paymentCollected: collected };

      let tokenSlip: ReceiptProps | null = null;

      if (isTakeaway) {
        const tokenRes = await fetch("/api/tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderNumber: data.orderNumber,
            customerName: customerName.trim() || undefined,
            paymentMethod,
            paymentCollected: collected,
            items: currentBill.map((l) => ({
              name: l.name,
              nameHi: l.nameHi,
              quantity: l.quantity,
              price: l.price,
            })),
            totalAmount: data.totalAmount,
            currency: data.currency,
            createdBy: currentUser?.username,
          }),
        });
        if (!tokenRes.ok) {
          const err = await tokenRes.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create token");
        }
        const { token } = await tokenRes.json();
        data = {
          ...data,
          tokenNumber: token.tokenLabel,
          tableNumber: token.tokenLabel,
          receiptHeaderNote: "KITCHEN / PACK COPY",
        };
        tokenSlip = {
          ...data,
          isTokenSlip: true,
          receiptHeaderNote: "",
        };
      }

      const payload = buildBillLogPayload(data);

      // 1) Save bill to database (no laptop required)
      const billRes = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!billRes.ok) {
        const err = await billRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save bill");
      }

      // 2) Clear table session (best-effort)
      try {
        await fetch("/api/table-sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableId: selectedTable,
            clear: true,
            updatedBy: currentUser?.username,
          }),
        });
      } catch {
        /* ignore */
      }

      setSessions((prev) => ({
        ...prev,
        [selectedTable]: {
          tableId: selectedTable,
          status: "empty",
          items: [],
          customerName: "",
          paymentMethod: "Cash",
          orderType: selectedTable === "PARCEL" ? "Takeaway" : "Dine-In",
          receipt: null,
        },
      }));
      setAmountReceived("");
      setPaymentCollected(true);
      if (selectedTable === "PARCEL") setCustomerName("");

      // 3) Print: takeaway = slim token (customer) then kitchen bill
      await printLocally(payload, tokenSlip);
      setBillStatusMsg(
        isTakeaway
          ? `${t("Token")} ${payload.tokenNumber} — ${t("Bill saved & sent to printer")}`
          : t("Bill saved & sent to printer")
      );
      setTimeout(() => setBillStatusMsg(""), 3500);
      setIsMobileCartOpen(false);
    } catch (err: any) {
      setPrinterError(err.message || t("Print failed"));
    } finally {
      setIsPrinting(false);
    }
  };

  const browserPrint = async () => {
    await makeBill();
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
  const menuGroups = (() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of itemsToShow) {
      const key = item.name.trim().toLowerCase();
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.values()).map((variants) =>
      [...variants].sort((a, b) => a.price - b.price)
    );
  })();

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
            <BrandLogo size={96} className="shadow-lg ring-2 ring-amber-400/70" />
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">{settings.restaurantName}</h1>
          <p className="text-center text-slate-500 mb-8">{t("Select an account to login")}</p>
          
          {!selectedUserForLogin ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {allUsers.length === 0 && (
                <div className="col-span-2 md:col-span-3 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-semibold flex flex-col items-center gap-3 text-center">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {dataLoadError || t("Could not load accounts")}
                  </span>
                  <button
                    type="button"
                    onClick={loadAppData}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg"
                  >
                    {t("Retry")}
                  </button>
                </div>
              )}
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleUserBoxClick(u)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 hover:scale-105 ${
                    u.role === "admin"
                      ? "border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      : u.role === "owner"
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : u.role === "laptop"
                      ? "border-blue-400 bg-blue-50 text-blue-800 hover:bg-blue-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <UserAvatar name={u.username} avatar={u.avatar} size="lg" />
                  <span className="font-bold text-lg">{u.username}</span>
                  <span className="text-xs uppercase tracking-wider font-semibold opacity-60">{u.role}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">
                  {selectedUserForLogin.role === "laptop" ? t("Laptop Login") : t("Admin Login")}: {selectedUserForLogin.username}
                </h2>
                <button 
                  onClick={() => setSelectedUserForLogin(null)}
                  className="text-sm text-slate-500 hover:text-slate-800 underline"
                >{t("Back")}</button>
              </div>

              {loginError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4" /> {loginError}
                </div>
              )}

              {fingerprintAvailable && fingerprintRegistered && (
                <div className="mb-5 space-y-3">
                  <button
                    type="button"
                    onClick={handleFingerprintLogin}
                    disabled={fingerprintBusy}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Fingerprint className="w-5 h-5" />
                    {fingerprintBusy ? "..." : t("Use Fingerprint")}
                  </button>
                  <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t("or use password")}
                  </p>
                </div>
              )}

              <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t("Password")}</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                    placeholder={t("Enter password")}
                    required
                    autoFocus={!fingerprintRegistered}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all mt-4"
                >{t("Login")}</button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fingerprint setup prompt (Android only, after password login)
  if (pendingFingerprintSetup) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
          <div className="mx-auto mb-4 bg-slate-900 w-14 h-14 rounded-2xl flex items-center justify-center">
            <Fingerprint className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t("Set up Fingerprint")}</h2>
          <p className="text-slate-500 mb-6">{t("Use fingerprint next time on this phone")}</p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleSetupFingerprint}
              disabled={fingerprintBusy}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-5 h-5" />
              {fingerprintBusy ? "..." : t("Set up Fingerprint")}
            </button>
            <button
              type="button"
              onClick={() => setPendingFingerprintSetup(null)}
              className="w-full text-slate-500 hover:text-slate-800 font-semibold py-2"
            >
              {t("Skip for now")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role === "laptop") {
    return (
      <LaptopBoard
        settings={settings}
        tables={tables}
        categories={categories}
        menuItems={menuItems}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  const isAdmin = currentUser.role === "admin";
  const canViewPastBills = currentUser.role === "admin" || currentUser.role === "owner";
  const currentBillData = buildReceiptData(settings, currentBill, currentTableName);

  const loadPastBills = async () => {
    setPastBillsLoading(true);
    try {
      const res = await fetch("/api/bills");
      if (res.ok) {
        const json = await res.json();
        setPastBills(json.bills || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPastBillsLoading(false);
    }
  };

  const openPastBills = () => {
    setTab("pastBills");
    loadPastBills();
  };

  const saveCurrentUserAvatar = async (dataUrl: string) => {
    if (!currentUser) return;
    const updatedUsers = allUsers.map((u) =>
      u.id === currentUser.id ? { ...u, avatar: dataUrl } : u
    );
    setAllUsers(updatedUsers);
    const nextUser = { ...currentUser, avatar: dataUrl };
    setCurrentUser(nextUser);
    localStorage.setItem("pos_session", JSON.stringify(nextUser));
    try {
      await fetch("/api/admin-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: updatedUsers }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleReprintPastBill = (bill: any) => {
    setReprintData(bill);
    setTimeout(() => {
      printThermalSection();
      setTimeout(() => setReprintData(null), 500);
    }, 100);
  };

  return (
    <div className={`h-screen bg-slate-100 text-slate-900 flex flex-col ${tab === "billing" ? "overflow-hidden" : "overflow-y-auto"}`}>
      {/* Header — brand only; nav/actions live in hamburger */}
      <header className="bg-slate-900 text-white px-3 py-2.5 flex items-center justify-between gap-3 shadow-md print:hidden shrink-0 relative z-40">
        <div className="flex items-center gap-2 min-w-0">
          <BrandLogo size={36} className="rounded-lg ring-1 ring-amber-400/50" />
          <h1 className="font-bold text-base sm:text-lg leading-tight truncate">{settings.restaurantName}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openVoiceBill}
            className="h-11 px-3 sm:px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-sm sm:text-base flex items-center gap-2 shadow-[0_0_0_3px_rgba(251,191,36,0.45)] active:scale-95 transition-all"
            title={t("Voice Bill")}
          >
            <Mic className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.75} />
            <span className="leading-none">{t("Voice Bill")}</span>
          </button>
          <button
            type="button"
            onClick={() => setNavMenuOpen((o) => !o)}
            className="shrink-0 w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
            aria-label={navMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={navMenuOpen}
          >
            {navMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {navMenuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40"
              aria-label="Close menu"
              onClick={() => setNavMenuOpen(false)}
            />
            <nav className="absolute top-full right-2 mt-1 z-50 w-[min(18rem,calc(100vw-1rem))] rounded-xl bg-slate-900 border border-slate-700 shadow-xl overflow-hidden">
              <div className="px-3 py-3 border-b border-slate-700 flex items-center gap-2">
                <UserAvatar
                  name={currentUser.username}
                  avatar={currentUser.avatar}
                  size="sm"
                  editable
                  onChange={saveCurrentUserAvatar}
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{currentUser.username}</div>
                  <div className="text-[11px] text-slate-400 truncate">{currentUser.role}</div>
                </div>
              </div>

              <div className="p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setTab("billing");
                    setNavMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                    tab === "billing" ? "bg-amber-500 text-white" : "text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  {t("Billing")}
                </button>
                {canViewPastBills && (
                  <button
                    type="button"
                    onClick={() => {
                      openPastBills();
                      setNavMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                      tab === "pastBills" ? "bg-amber-500 text-white" : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <History className="w-4 h-4" />
                    {t("Past Bills")}
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab("about");
                      setNavMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                      tab === "about" ? "bg-amber-500 text-white" : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    {t("Settings")}
                  </button>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setNavMenuOpen(false)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 text-slate-200 hover:bg-slate-800"
                  >
                    <Shield className="w-4 h-4" />
                    {t("Admin Access")}
                  </Link>
                )}
              </div>

              <div className="border-t border-slate-700 p-1.5 space-y-0.5">
                <div
                  className={`mx-1.5 mb-1 flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded-lg font-semibold ${
                    printerConnected
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {printerConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                  <span className="truncate">
                    {printerConnected ? t("Printer connected & ready") : t("Browser print OK")}
                  </span>
                </div>
                {printerConnected && (
                  <button
                    type="button"
                    onClick={() => {
                      stopPrinter();
                      setNavMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm font-semibold text-red-300 hover:bg-red-950/50"
                  >
                    {t("Stop printer")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    toggleLang();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 text-slate-200 hover:bg-slate-800"
                >
                  <Languages className="w-4 h-4" />
                  {lang === "en" ? "Aअ / हिन्दी" : "EN / English"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNavMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 text-slate-200 hover:bg-slate-800"
                >
                  <LogOut className="w-4 h-4" />
                  {t("Logout")}
                </button>
              </div>
            </nav>
          </>
        )}
      </header>

      {printerError && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 text-sm px-4 py-2 flex items-start gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{printerError}</span>
        </div>
      )}
      {billStatusMsg && !printerError && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-sm px-4 py-2 flex items-center gap-2 print:hidden font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{billStatusMsg}</span>
        </div>
      )}

      {/* ================= BILLING TAB ================= */}
      {tab === "billing" && (
        <>
          <div className="bg-white border-b border-slate-200 px-3 py-2 print:hidden shrink-0">
            <button
              type="button"
              onClick={openVoiceBill}
              className="w-full mb-2 h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-lg flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] transition-all"
            >
              <span className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center">
                <Mic className="w-6 h-6" strokeWidth={2.75} />
              </span>
              <span className="flex flex-col items-start leading-tight">
                <span>{t("Voice Bill")}</span>
                <span className="text-[11px] font-bold text-slate-800/70 normal-case tracking-normal">
                  {t("Tap to speak")}
                </span>
              </span>
            </button>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex justify-between gap-2 flex-wrap">
              <span>{t("Select Table")}</span>
              <span className="normal-case font-semibold text-slate-400">
                <span className="text-red-500">●</span> {t("empty")}{" "}
                <span className="text-amber-500">●</span> {t("ongoing")}{" "}
                <span className="text-emerald-500">●</span> {t("ready")}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(() => {
                const parcel = getSession("PARCEL");
                const qty = parcel.items.reduce((a, l) => a + l.quantity, 0);
                const color =
                  parcel.status === "ready"
                    ? "bg-emerald-500 border-emerald-600 text-white"
                    : parcel.status === "ongoing"
                    ? "bg-amber-400 border-amber-500 text-slate-900"
                    : "bg-red-50 border-red-300 text-red-800";
                return (
                  <button
                    onClick={() => setSelectedTable("PARCEL")}
                    className={`relative px-3 py-1.5 rounded-lg font-bold text-xs border-2 transition-all ${color} ${
                      selectedTable === "PARCEL" ? "shadow-md ring-2 ring-offset-1 ring-slate-400" : ""
                    }`}
                  >
                    {t("PARCEL (Takeaway)")}
                    {qty > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-slate-900 text-white">
                        {qty}
                      </span>
                    )}
                  </button>
                );
              })()}

              {tables.map((tbl) => {
                const s = getSession(tbl.id);
                const isSel = selectedTable === tbl.id;
                const qty = s.items.reduce((a, l) => a + l.quantity, 0);
                const color =
                  s.status === "ready"
                    ? "bg-emerald-500 border-emerald-600 text-white"
                    : s.status === "ongoing"
                    ? "bg-amber-400 border-amber-500 text-slate-900"
                    : "bg-red-50 border-red-300 text-red-800";
                return (
                  <button
                    key={tbl.id}
                    onClick={() => setSelectedTable(tbl.id)}
                    className={`relative px-3 py-1.5 rounded-lg font-bold text-xs border-2 transition-all ${color} ${
                      isSel ? "shadow-md ring-2 ring-offset-1 ring-slate-400" : ""
                    }`}
                  >
                    {tbl.name}
                    {qty > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-slate-900 text-white">
                        {qty}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {(selectedTable === "PARCEL" || paymentMethod === "Udhaar") && (
              <div className="mt-2 max-w-sm">
                <input
                  type="text"
                  placeholder={
                    paymentMethod === "Udhaar"
                      ? t("Customer Name (Required for Udhaar)")
                      : t("Customer Name (Optional)")
                  }
                  value={customerName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setCustomerName(name);
                    if (!selectedTable) return;
                    const prev = getSession(selectedTable);
                    persistCart(selectedTable, { ...prev, customerName: name, paymentMethod });
                  }}
                  className={`w-full border-2 focus:ring-2 rounded-lg px-3 py-1.5 text-sm outline-none transition-all ${
                    paymentMethod === "Udhaar" && !customerName.trim()
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-emerald-200 focus:border-emerald-500 focus:ring-emerald-200"
                  }`}
                />
              </div>
            )}
          </div>

          <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2 p-2 w-full mx-auto print:hidden pb-20 lg:pb-2">
            <section className="lg:flex-1 min-h-0 flex flex-col gap-1.5 overflow-y-auto">
              {/* Fast Items */}
              {fastItems.length > 0 && (
                <div className="shrink-0">
                  <h2 className="text-[10px] font-bold text-amber-600 flex items-center gap-1 uppercase tracking-wide mb-1">
                    {t("Fast Items (Quick Add)")}
                  </h2>
                  <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
                    {fastItems.map((item) => (
                      <button
                        key={`fast-${item.id}`}
                        onClick={() => addItem(item)}
                        disabled={!selectedTable}
                        className="whitespace-nowrap px-2 py-1 rounded-md font-semibold text-xs border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {localizedName(item, lang)}{" "}
                        <span className="font-mono font-bold">
                          {CURRENCY}{item.price}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category selector */}
              {categories.length > 0 && (
                <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide shrink-0">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCategory(c.id);
                        setPricePickerKey(null);
                      }}
                      className={`whitespace-nowrap px-2 py-1 rounded-md font-semibold text-xs border transition-colors ${
                        selectedCategory === c.id
                          ? "bg-slate-800 border-slate-800 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {localizedName(c, lang)}
                    </button>
                  ))}
                </div>
              )}

              <h2 className="text-xs font-bold text-slate-500 tracking-wide shrink-0">
                {selectedTable ? `${t("Add Items to")} ${currentTableName}` : t("Select a table first")}
              </h2>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-1.5 content-start">
                {menuGroups.map((variants) => {
                  const primary = variants[0];
                  const groupKey = primary.name.trim().toLowerCase();
                  const isMulti = variants.length > 1;
                  const pickerOpen = pricePickerKey === groupKey;
                  const qtyKey = groupKey;
                  const qtyValue = menuQtyDraft[qtyKey] ?? "1";

                  if (isMulti) {
                    const minPrice = variants[0].price;
                    return (
                      <div
                        key={groupKey}
                        className={`bg-white border rounded-lg p-1.5 text-left transition-all flex flex-col ${
                          pickerOpen
                            ? "border-amber-400 shadow-sm col-span-2"
                            : "border-slate-200 hover:border-amber-400"
                        } ${!selectedTable ? "opacity-50" : ""}`}
                      >
                        <button
                          type="button"
                          disabled={!selectedTable}
                          onClick={() =>
                            setPricePickerKey((k) => (k === groupKey ? null : groupKey))
                          }
                          className="w-full text-left disabled:cursor-not-allowed"
                        >
                          <div className="font-semibold text-[13px] leading-tight text-slate-900 line-clamp-2">
                            {localizedName(primary, lang)}
                          </div>
                          <div className="mt-0.5">
                            <div className="text-amber-600 font-bold font-mono text-xs">
                              {CURRENCY}{minPrice.toFixed(0)}+
                            </div>
                            <div className="text-[9px] font-semibold text-slate-400">
                              {t("Select price")}
                            </div>
                          </div>
                        </button>

                        {pickerOpen && (
                          <div className="pt-1 mt-1 border-t border-slate-100 space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{t("Qty")}</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={qtyValue}
                                onChange={(e) => setMenuQty(qtyKey, e.target.value)}
                                onFocus={(e) => e.target.select()}
                                disabled={!selectedTable}
                                className="w-9 h-6 rounded border border-slate-200 text-center font-bold text-xs text-slate-900 focus:border-amber-400 focus:outline-none disabled:cursor-not-allowed"
                              />
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {variants.map((v) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  disabled={!selectedTable}
                                  onClick={() => {
                                    addItem(v, getMenuQty(qtyKey));
                                    setMenuQtyDraft((prev) => ({ ...prev, [qtyKey]: "1" }));
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-bold font-mono text-[11px] hover:bg-amber-100 active:scale-95 disabled:cursor-not-allowed"
                                >
                                  {CURRENCY}{v.price.toFixed(0)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={primary.id}
                      className="bg-white border border-slate-200 hover:border-amber-400 rounded-lg p-1.5 text-left transition-all flex flex-col"
                    >
                      <div className="font-semibold text-[13px] leading-tight text-slate-900 line-clamp-2">
                        {localizedName(primary, lang)}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="text-amber-600 font-bold font-mono text-xs shrink-0">
                          {CURRENCY}{primary.price.toFixed(0)}
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={qtyValue}
                          onChange={(e) => setMenuQty(qtyKey, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && selectedTable) {
                              addItem(primary, getMenuQty(qtyKey));
                              setMenuQtyDraft((prev) => ({ ...prev, [qtyKey]: "1" }));
                            }
                          }}
                          disabled={!selectedTable}
                          title={t("Qty")}
                          className="w-7 h-6 flex-1 min-w-0 rounded border border-slate-200 text-center font-bold text-xs text-slate-900 focus:border-amber-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            addItem(primary, getMenuQty(qtyKey));
                            setMenuQtyDraft((prev) => ({ ...prev, [qtyKey]: "1" }));
                          }}
                          disabled={!selectedTable}
                          className="shrink-0 w-6 h-6 rounded bg-amber-500 text-white flex items-center justify-center active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Add"
                        >
                          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {menuGroups.length === 0 && selectedCategory && (
                  <div className="col-span-full py-6 text-center text-slate-400 font-medium text-sm">
                    No items found in this category.
                  </div>
                )}
                {categories.length === 0 && (
                  <div className="col-span-full py-6 text-center text-slate-400 font-medium text-sm">
                    Please go to Admin to add categories and menu items.
                  </div>
                )}
              </div>
            </section>

            <section className={`lg:w-[340px] xl:w-[360px] shrink-0 min-h-0 ${isMobileCartOpen ? 'fixed inset-0 z-50 bg-black/60 flex flex-col justify-end p-0 sm:p-3 pb-0' : 'hidden lg:flex lg:flex-col'}`}>
              <div className="bg-white rounded-t-xl lg:rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[90vh] sm:h-[85vh] lg:h-full min-h-0 mt-auto w-full max-w-sm mx-auto lg:max-w-none">
                <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                  <h2 className="font-bold text-sm text-slate-800 flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-amber-500" />
                    Bill — {currentTableName}
                    {currentBill.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        ({currentBill.reduce((a, l) => a + l.quantity, 0)})
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-1">
                    {currentBill.length > 0 && (
                      <button
                        onClick={clearBill}
                        className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5 font-bold bg-red-50 px-1.5 py-0.5 rounded"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                    {isMobileCartOpen && (
                      <button onClick={() => setIsMobileCartOpen(false)} className="lg:hidden text-slate-500 bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-2 py-1.5 border-b border-slate-100 bg-amber-50/60 shrink-0 space-y-1">
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                    {t("Misc item")}
                  </div>
                  <input
                    type="text"
                    value={miscName}
                    onChange={(e) => setMiscName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addMiscItem();
                    }}
                    placeholder={t("Item name")}
                    disabled={!selectedTable}
                    className="w-full h-7 px-2 rounded border border-amber-200 bg-white text-xs text-slate-800 focus:border-amber-400 focus:outline-none disabled:opacity-50"
                  />
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-mono pointer-events-none">
                        {CURRENCY}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={miscPrice}
                        onChange={(e) => setMiscPrice(e.target.value.replace(/[^\d.]/g, ""))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addMiscItem();
                        }}
                        placeholder={t("Price")}
                        disabled={!selectedTable}
                        className="w-full h-7 pl-7 pr-1 rounded border border-amber-200 bg-white text-xs font-mono text-slate-800 focus:border-amber-400 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={miscQty}
                      onChange={(e) => setMiscQty(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addMiscItem();
                      }}
                      placeholder={t("Qty")}
                      disabled={!selectedTable}
                      title={t("Qty")}
                      className="w-10 h-7 rounded border border-amber-200 bg-white text-center text-xs font-bold text-slate-800 focus:border-amber-400 focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={addMiscItem}
                      disabled={
                        !selectedTable ||
                        !miscName.trim() ||
                        miscPrice === "" ||
                        !Number.isFinite(Number(miscPrice)) ||
                        Number(miscPrice) < 0
                      }
                      className="h-7 px-2 rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-[11px] font-bold shrink-0"
                    >
                      {t("Add misc")}
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 p-1.5 overflow-y-auto bg-slate-50">
                  {currentBill.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-4">
                      <Receipt className="w-6 h-6 mb-1 stroke-1 opacity-50" />
                      <p className="text-xs font-semibold">No items yet</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {currentBill.map((line) => (
                        <div
                          key={line.id}
                          className="bg-white border border-slate-200 rounded-md px-2 py-1.5"
                        >
                          <div className="font-semibold text-xs leading-tight text-slate-900 truncate">
                            {localizedName(line, lang)}
                          </div>
                          <div className="flex items-center justify-between gap-1.5 mt-1">
                            <div className="text-[11px] text-slate-500 font-mono truncate">
                              {CURRENCY}{line.price.toFixed(0)}×{line.quantity}=
                              <span className="font-bold text-amber-600">
                                {CURRENCY}{(line.price * line.quantity).toFixed(0)}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={() => {
                                  setCartQtyDraft((prev) => {
                                    const next = { ...prev };
                                    delete next[line.id];
                                    return next;
                                  });
                                  changeQty(line.id, -1);
                                }}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                                aria-label="Decrease"
                              >
                                <Minus className="w-3 h-3" strokeWidth={2.5} />
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={cartQtyDraft[line.id] ?? String(line.quantity)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 3);
                                  setCartQtyDraft((prev) => ({ ...prev, [line.id]: raw }));
                                  if (raw !== "") setQty(line.id, Number(raw));
                                }}
                                onBlur={() => {
                                  const draft = cartQtyDraft[line.id];
                                  setCartQtyDraft((prev) => {
                                    const next = { ...prev };
                                    delete next[line.id];
                                    return next;
                                  });
                                  if (draft === "" || Number(draft) < 1) setQty(line.id, 1);
                                }}
                                onFocus={(e) => e.target.select()}
                                className="w-8 h-6 text-center font-bold text-xs text-slate-900 tabular-nums border border-slate-200 rounded bg-white focus:border-amber-400 focus:outline-none"
                                aria-label="Quantity"
                              />
                              <button
                                onClick={() => {
                                  setCartQtyDraft((prev) => {
                                    const next = { ...prev };
                                    delete next[line.id];
                                    return next;
                                  });
                                  changeQty(line.id, 1);
                                }}
                                className="w-6 h-6 rounded bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-white"
                                aria-label="Increase"
                              >
                                <Plus className="w-3 h-3" strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 px-2.5 py-1.5 space-y-1 text-sm bg-white shrink-0">
                  {TAX_RATE > 0 && (
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>{t("Subtotal")}</span>
                      <span className="font-mono">{CURRENCY} {subtotal.toFixed(2)}</span>
                    </div>
                  )}
                  {TAX_RATE > 0 && (
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>Tax ({TAX_RATE}%)</span>
                      <span className="font-mono">{CURRENCY} {taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-xs text-slate-800">{t("TOTAL")}</span>
                    <span className="font-extrabold font-mono text-lg text-amber-600">
                      {CURRENCY} {total.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1">
                    {["Cash", "UPI", "Udhaar"].map((pmLabel) => (
                      <button
                        key={pmLabel}
                        onClick={() => {
                          const pm = pmLabel as "Cash" | "UPI" | "Udhaar";
                          setPaymentMethod(pm);
                          if (pm !== "Cash") setAmountReceived("");
                          if (pm === "Udhaar") setPaymentCollected(false);
                          else if (selectedTable === "PARCEL") setPaymentCollected(true);
                          if (!selectedTable) return;
                          const prev = getSession(selectedTable);
                          persistCart(selectedTable, { ...prev, paymentMethod: pm, customerName });
                        }}
                        className={`py-1 rounded text-[11px] font-bold border transition-colors ${
                          paymentMethod === pmLabel
                            ? pmLabel === "Udhaar"
                              ? "bg-red-50 border-red-500 text-red-700"
                              : "bg-slate-800 border-slate-800 text-white"
                            : "bg-white border-slate-200 text-slate-500"
                        }`}
                      >
                        {t(pmLabel)}
                      </button>
                    ))}
                  </div>

                  {selectedTable === "PARCEL" && paymentMethod !== "Udhaar" && (
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setPaymentCollected(true)}
                        className={`py-1 rounded text-[11px] font-bold border transition-colors ${
                          paymentCollected
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-white border-slate-200 text-slate-500"
                        }`}
                      >
                        {t("Paid now")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentCollected(false)}
                        className={`py-1 rounded text-[11px] font-bold border transition-colors ${
                          !paymentCollected
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "bg-white border-slate-200 text-slate-500"
                        }`}
                      >
                        {t("Collect at pickup")}
                      </button>
                    </div>
                  )}

                  {paymentMethod === "Cash" && currentBill.length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="relative flex-1">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-mono pointer-events-none">
                          {CURRENCY}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="decimal"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                          placeholder="Recv"
                          className="w-full pl-6 pr-1 py-1 rounded border border-slate-200 bg-slate-50 text-slate-800 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      {changeReturn !== null && (
                        <div
                          className={`shrink-0 rounded px-1.5 py-1 text-[10px] font-bold font-mono ${
                            changeReturn >= 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {changeReturn >= 0 ? "Chg" : "Short"} {Math.abs(changeReturn).toFixed(0)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowPreviewModal(true)}
                      disabled={currentBill.length === 0}
                      className="shrink-0 w-8 h-8 bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 rounded flex items-center justify-center"
                      title={t("Preview Receipt")}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={makeBill}
                      disabled={currentBill.length === 0 || isPrinting || (paymentMethod === "Udhaar" && !customerName.trim())}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-1.5 rounded text-xs flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
                    >
                      {isPrinting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                      {isPrinting
                        ? t("Printing...")
                        : paymentMethod === "Udhaar" && !customerName.trim()
                        ? t("Enter Name for Udhaar")
                        : selectedTable === "PARCEL"
                        ? t("Print Token + Bill")
                        : t("Print Bill")}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </main>

          {!isMobileCartOpen && tab === "billing" && !showVoiceBill && !showPreviewModal && (
            <button
              type="button"
              onClick={openVoiceBill}
              className={`lg:hidden fixed z-40 left-4 w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-[0_10px_28px_rgba(245,158,11,0.6)] ring-4 ring-amber-200 flex items-center justify-center active:scale-95 transition-all print:hidden ${
                selectedTable && currentBill.length > 0 ? "bottom-24" : "bottom-6"
              }`}
              aria-label={t("Voice Bill")}
            >
              <Mic className="w-10 h-10" strokeWidth={2.75} />
            </button>
          )}

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
                  {t("View Cart")} <Receipt className="w-4 h-4" />
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
                    <Eye className="w-5 h-5 text-amber-500" /> {t("Receipt Preview")}
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
                    <Printer className="w-5 h-5" /> {t("Print Bill")}
                  </button>
                </div>
              </div>
            </div>
          )}

        </>
      )}

      {/* ================= PAST BILLS (owner + admin) ================= */}
      {tab === "pastBills" && canViewPastBills && (
        <main className="flex-1 p-4 max-w-5xl w-full mx-auto print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-500" /> {t("Past Bills")}
                </h2>
                <p className="text-sm text-slate-500">{t("View and reprint previous bills")}</p>
              </div>
              <button
                type="button"
                onClick={loadPastBills}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${pastBillsLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left p-3 font-semibold">{t("Bill #")}</th>
                    <th className="text-left p-3 font-semibold">{t("Table / Customer")}</th>
                    <th className="text-left p-3 font-semibold">Date</th>
                    <th className="text-left p-3 font-semibold">Payment</th>
                    <th className="text-right p-3 font-semibold">Total</th>
                    <th className="text-right p-3 font-semibold">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pastBillsLoading && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">Loading...</td>
                    </tr>
                  )}
                  {!pastBillsLoading && pastBills.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">{t("No bills found.")}</td>
                    </tr>
                  )}
                  {!pastBillsLoading &&
                    pastBills.map((b) => (
                      <tr key={b.id || b.orderNumber} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-mono font-semibold text-slate-800">{b.orderNumber}</td>
                        <td className="p-3 text-slate-700">
                          <div>{b.tableNumber || "—"}</div>
                          {b.customerName && (
                            <div className="text-xs text-slate-500">{b.customerName}</div>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">{b.date || (b.timestamp ? new Date(b.timestamp).toLocaleString() : "—")}</td>
                        <td className="p-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {b.paymentMethod || "—"}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {settings.currency}{Number(b.totalAmount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleReprintPastBill(b)}
                            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                          >
                            <PrinterIcon className="w-3.5 h-3.5" /> Reprint
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
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
                  <Store className="w-5 h-5 text-amber-500" /> {t("Restaurant Details (top of bill)")}
                </h2>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{t("Restaurant Name")}</label>
                  <input
                    value={form.restaurantName}
                    onChange={(e) => setField("restaurantName", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{t("Tagline")}</label>
                  <input
                    value={form.tagline}
                    onChange={(e) => setField("tagline", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{t("Address")}</label>
                  <input
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1">{t("Phone")}</label>
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
                    <label className="block text-xs font-bold text-slate-600 mb-1">{t("Tax %")}</label>
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
                  <QrCode className="w-5 h-5 text-emerald-500" /> {t("UPI Payment QR (amount auto-fills)")}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your <b>UPI ID / VPA</b> (e.g. <span className="font-mono">mahankalfoodpark@okhdfcbank</span>).
                  A QR code is printed on every bill. When a customer scans it, their UPI app
                  (GPay, PhonePe, Paytm, BHIM) opens with your ID pre-filled and the <b>amount automatically
                  set to that bill&apos;s total</b> — they only enter their PIN. Leave empty to hide the QR.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{t("UPI ID / VPA")}</label>
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
                  <Receipt className="w-5 h-5 text-amber-500" /> {t("About Us — printed at BOTTOM of bill")}
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
                {saving ? t("Saving...") : saved ? t("Saved!") : t("Save Details")}
              </button>
            </form>

            {/* Live preview */}
            <div className="lg:sticky lg:top-4">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> {t("Live Bill Preview")}
              </h2>
              <div className="bg-slate-200 rounded-2xl p-4 flex justify-center overflow-x-auto">
                <PrintableReceipt {...previewData} />
              </div>
            </div>
          </div>
        </main>
      )}

      <VoiceBillModal
        ref={voiceBillRef}
        open={showVoiceBill}
        onClose={() => setShowVoiceBill(false)}
        menuItems={menuItems}
        tables={tables}
        selectedTable={selectedTable}
        currency={CURRENCY}
        lang={lang}
        t={t}
        onApprove={applyVoiceBill}
      />

      {/* Hidden print area */}
      <div id="thermal-print-section" className="hidden print:block">
        {reprintData ? (
          <PrintableReceipt {...reprintData} />
        ) : (
          printData && <PrintableReceipt {...printData} />
        )}
      </div>
    </div>
  );
}
