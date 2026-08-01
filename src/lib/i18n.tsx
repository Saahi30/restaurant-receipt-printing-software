"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "hi";

export const translations: Record<string, Record<Language, string>> = {
  // Navigation & General
  "Billing": { en: "Billing", hi: "बिलिंग" },
  "Settings": { en: "Settings", hi: "सेटिंग्स" },
  "Admin Access": { en: "Admin Access", hi: "एडमिन एक्सेस" },
  "Logout": { en: "Logout", hi: "लॉग आउट" },
  "Disconnect": { en: "Disconnect", hi: "डिस्कनेक्ट" },
  "Detect Printer": { en: "Detect Printer", hi: "प्रिंटर जोड़ें" },
  "Print via Laptop": { en: "Print via Laptop", hi: "लैपटॉप से प्रिंट" },
  "Refresh": { en: "Refresh", hi: "रीफ़्रेश" },
  "Loading...": { en: "Loading...", hi: "लोड हो रहा है..." },
  "Saved!": { en: "Saved!", hi: "सेव हो गया!" },
  "Save Changes": { en: "Save Changes", hi: "बदलाव सेव करें" },
  "Save Details": { en: "Save Details", hi: "विवरण सेव करें" },

  // Login
  "Select an account to login": { en: "Select an account to login", hi: "लॉगिन के लिए अकाउंट चुनें" },
  "Admin Login": { en: "Admin Login", hi: "एडमिन लॉगिन" },
  "Laptop Login": { en: "Laptop Login", hi: "लैपटॉप लॉगिन" },
  "Password": { en: "Password", hi: "पासवर्ड" },
  "Enter password": { en: "Enter password", hi: "पासवर्ड दर्ज करें" },
  "Login": { en: "Login", hi: "लॉगिन करें" },
  "Back": { en: "Back", hi: "वापस" },
  "Invalid password": { en: "Invalid password", hi: "गलत पासवर्ड" },
  "Use Fingerprint": { en: "Use Fingerprint", hi: "फ़िंगरप्रिंट उपयोग करें" },
  "or use password": { en: "or use password", hi: "या पासवर्ड उपयोग करें" },
  "Fingerprint failed. Try password.": {
    en: "Fingerprint failed. Try password.",
    hi: "फ़िंगरप्रिंट असफल। पासवर्ड आज़माएँ।",
  },
  "Set up Fingerprint": { en: "Set up Fingerprint", hi: "फ़िंगरप्रिंट सेट करें" },
  "Skip for now": { en: "Skip for now", hi: "अभी छोड़ें" },
  "Use fingerprint next time on this phone": {
    en: "Use fingerprint next time on this phone?",
    hi: "अगली बार इस फ़ोन पर फ़िंगरप्रिंट उपयोग करें?",
  },
  "Fingerprint enabled": { en: "Fingerprint enabled", hi: "फ़िंगरप्रिंट चालू हो गया" },
  "Fingerprint setup failed": { en: "Fingerprint setup failed", hi: "फ़िंगरप्रिंट सेटअप असफल" },
  "Fingerprint needs HTTPS": {
    en: "Fingerprint needs HTTPS on this device",
    hi: "फ़िंगरप्रिंट के लिए HTTPS आवश्यक है",
  },

  // Billing
  "Select Table": { en: "Select Table", hi: "टेबल चुनें" },
  "empty": { en: "empty", hi: "खाली" },
  "ongoing": { en: "ongoing", hi: "चालू" },
  "ready": { en: "ready", hi: "तैयार" },
  "Customer Name (Optional)": { en: "Customer Name (Optional)", hi: "ग्राहक का नाम (वैकल्पिक)" },
  "Customer Name (Required for Udhaar)": {
    en: "Customer Name (Required for Udhaar)",
    hi: "ग्राहक का नाम (उधार के लिए ज़रूरी)",
  },
  "Customer Name": { en: "Customer Name", hi: "ग्राहक का नाम" },
  "Customer name": { en: "Customer name", hi: "ग्राहक का नाम" },
  "Payment": { en: "Payment", hi: "भुगतान" },
  "Payment Method": { en: "Payment Method", hi: "भुगतान का तरीका" },
  "Cash": { en: "Cash", hi: "नकद" },
  "UPI": { en: "UPI", hi: "यूपीआई" },
  "Udhaar": { en: "Udhaar", hi: "उधार" },
  "Menu Categories": { en: "Menu Categories", hi: "मेनू श्रेणियाँ" },
  "No items in this category.": { en: "No items in this category.", hi: "इस श्रेणी में कोई आइटम नहीं है।" },
  "Select a category to view items.": {
    en: "Select a category to view items.",
    hi: "आइटम देखने के लिए श्रेणी चुनें।",
  },
  "Search items...": { en: "Search items...", hi: "आइटम खोजें..." },
  "Fast Items (Quick Add)": { en: "Fast Items (Quick Add)", hi: "फ़ास्ट आइटम (जल्दी जोड़ें)" },
  "Select a table first": { en: "Select a table first", hi: "पहले टेबल चुनें" },
  "Add Items to": { en: "Add Items to", hi: "आइटम जोड़ें —" },
  "Current Bill": { en: "Current Bill", hi: "वर्तमान बिल" },
  "Select a table first to start billing": {
    en: "Select a table first to start billing",
    hi: "बिलिंग शुरू करने के लिए पहले टेबल चुनें",
  },
  "Empty Bill": { en: "Empty Bill", hi: "बिल खाली है" },
  "Add items from the menu": { en: "Add items from the menu", hi: "मेनू से आइटम जोड़ें" },
  "Subtotal": { en: "Subtotal", hi: "उप-योग" },
  "Tax": { en: "Tax", hi: "टैक्स" },
  "TOTAL": { en: "TOTAL", hi: "कुल" },
  "Grand Total": { en: "Grand Total", hi: "कुल योग" },
  "Save Bill": { en: "Save Bill", hi: "बिल सेव करें" },
  "Print Receipt": { en: "Print Receipt", hi: "रसीद प्रिंट करें" },
  "Thermal Print": { en: "Thermal Print", hi: "थर्मल प्रिंट" },
  "Preview": { en: "Preview", hi: "पूर्वावलोकन" },
  "Preview Receipt": { en: "Preview Receipt", hi: "रसीद देखें" },
  "Receipt Preview": { en: "Receipt Preview", hi: "रसीद पूर्वावलोकन" },
  "Generate Bill": { en: "Generate Bill", hi: "बिल बनाएँ" },
  "Sending...": { en: "Sending...", hi: "भेजा जा रहा है..." },
  "Enter Name for Udhaar": { en: "Enter Name for Udhaar", hi: "उधार के लिए नाम दर्ज करें" },
  "Waiting on laptop...": { en: "Waiting on laptop...", hi: "लैपटॉप की प्रतीक्षा..." },
  "Sent to laptop": { en: "Sent to laptop", hi: "लैपटॉप पर भेज दिया" },
  "Connect laptop": { en: "Connect laptop", hi: "लैपटॉप कनेक्ट करें" },
  "Connect laptop — open the Laptop account on the PC and connect the printer.": {
    en: "Connect laptop — open the Laptop account on the PC and connect the printer.",
    hi: "लैपटॉप कनेक्ट करें — कंप्यूटर पर लैपटॉप अकाउंट खोलें और प्रिंटर जोड़ें।",
  },
  "Could not send bill to laptop": {
    en: "Could not send bill to laptop",
    hi: "बिल लैपटॉप पर नहीं भेजा जा सका",
  },
  "View Cart": { en: "View Cart", hi: "कार्ट देखें" },
  "items": { en: "items", hi: "आइटम" },
  "Amount Received": { en: "Amount Received", hi: "प्राप्त राशि" },
  "Return / Change": { en: "Return / Change", hi: "वापसी / छुट्टा" },
  "Short by": { en: "Short by", hi: "कम पड़े" },
  "Clear Bill": { en: "Clear Bill", hi: "बिल साफ़ करें" },
  "PARCEL (Takeaway)": { en: "PARCEL (Takeaway)", hi: "पार्सल (टेकअवे)" },
  "Parcel (Takeaway)": { en: "Parcel (Takeaway)", hi: "पार्सल (टेकअवे)" },
  "Unknown Table": { en: "Unknown Table", hi: "अज्ञात टेबल" },
  "Live Bill Preview": { en: "Live Bill Preview", hi: "लाइव बिल पूर्वावलोकन" },

  // Past bills
  "Past Bills": { en: "Past Bills", hi: "पुराने बिल" },
  "View and reprint previous bills": {
    en: "View and reprint previous bills",
    hi: "पिछले बिल देखें और दोबारा प्रिंट करें",
  },
  "No bills found.": { en: "No bills found.", hi: "कोई बिल नहीं मिला।" },
  "Bill #": { en: "Bill #", hi: "बिल #" },
  "Table / Customer": { en: "Table / Customer", hi: "टेबल / ग्राहक" },
  "Reprint": { en: "Reprint", hi: "दोबारा प्रिंट" },

  // Settings
  "App Settings": { en: "App Settings", hi: "ऐप सेटिंग्स" },
  "Restaurant Name": { en: "Restaurant Name", hi: "रेस्टोरेंट का नाम" },
  "Tagline": { en: "Tagline", hi: "टैगलाइन" },
  "Address": { en: "Address", hi: "पता" },
  "Phone": { en: "Phone", hi: "फ़ोन" },
  "Currency Symbol": { en: "Currency Symbol", hi: "मुद्रा चिह्न" },
  "Tax Rate (%)": { en: "Tax Rate (%)", hi: "टैक्स दर (%)" },
  "Tax %": { en: "Tax %", hi: "टैक्स %" },
  "UPI ID": { en: "UPI ID", hi: "यूपीआई आईडी" },
  "UPI ID / VPA": { en: "UPI ID / VPA", hi: "यूपीआई आईडी / वीपीए" },
  "Footer Text": { en: "Footer Text", hi: "फ़ुटर टेक्स्ट" },
  "About Us (Printed on receipt)": {
    en: "About Us (Printed on receipt)",
    hi: "हमारे बारे में (रसीद पर छपेगा)",
  },
  "Restaurant Details (top of bill)": {
    en: "Restaurant Details (top of bill)",
    hi: "रेस्टोरेंट विवरण (बिल के ऊपर)",
  },
  "UPI Payment QR (amount auto-fills)": {
    en: "UPI Payment QR (amount auto-fills)",
    hi: "यूपीआई भुगतान QR (राशि अपने आप भरती है)",
  },
  "About Us — printed at BOTTOM of bill": {
    en: "About Us — printed at BOTTOM of bill",
    hi: "हमारे बारे में — बिल के नीचे छपेगा",
  },
  "Save Settings": { en: "Save Settings", hi: "सेटिंग्स सेव करें" },
  "Saving...": { en: "Saving...", hi: "सेव हो रहा है..." },
  "Settings saved successfully!": {
    en: "Settings saved successfully!",
    hi: "सेटिंग्स सफलतापूर्वक सेव हो गईं!",
  },

  // Admin
  "Dashboard": { en: "Dashboard", hi: "डैशबोर्ड" },
  "Menu Management": { en: "Menu Management", hi: "मेनू प्रबंधन" },
  "Users": { en: "Users", hi: "उपयोगकर्ता" },
  "User Management": { en: "User Management", hi: "उपयोगकर्ता प्रबंधन" },
  "Data Sync": { en: "Data Sync", hi: "डेटा सिंक" },
  "Back to Billing": { en: "Back to Billing", hi: "बिलिंग पर वापस जाएँ" },
  "Back to POS": { en: "Back to POS", hi: "POS पर वापस" },
  "Admin Dashboard": { en: "Admin Dashboard", hi: "एडमिन डैशबोर्ड" },
  "Manage menu, categories, and tables": {
    en: "Manage menu, categories, and tables",
    hi: "मेनू, श्रेणियाँ और टेबल प्रबंधित करें",
  },
  "Overview": { en: "Overview", hi: "अवलोकन" },
  "Total Categories": { en: "Total Categories", hi: "कुल श्रेणियाँ" },
  "Total Menu Items": { en: "Total Menu Items", hi: "कुल मेनू आइटम" },
  "Total Tables": { en: "Total Tables", hi: "कुल टेबल" },
  "Tables": { en: "Tables", hi: "टेबल" },
  "Categories": { en: "Categories", hi: "श्रेणियाँ" },
  "Add New Item": { en: "Add New Item", hi: "नया आइटम जोड़ें" },
  "Add User": { en: "Add User", hi: "उपयोगकर्ता जोड़ें" },
  "Add Table": { en: "Add Table", hi: "टेबल जोड़ें" },
  "Add Category": { en: "Add Category", hi: "श्रेणी जोड़ें" },
  "Table Name": { en: "Table Name", hi: "टेबल का नाम" },
  "Category Name": { en: "Category Name", hi: "श्रेणी का नाम" },
  "Item Name": { en: "Item Name", hi: "आइटम का नाम" },
  "Username": { en: "Username", hi: "उपयोगकर्ता नाम" },
  "Price": { en: "Price", hi: "कीमत" },
  "Actions": { en: "Actions", hi: "कार्रवाई" },
  "Delete": { en: "Delete", hi: "हटाएँ" },
  "Delete user": { en: "Delete user", hi: "उपयोगकर्ता हटाएँ" },
  "Cannot delete the last admin": {
    en: "Cannot delete the last admin",
    hi: "अंतिम एडमिन नहीं हटा सकते",
  },
  "Add to Fast Items": { en: "Add to Fast Items", hi: "फ़ास्ट आइटम में जोड़ें" },
  "Remove from Fast Items": { en: "Remove from Fast Items", hi: "फ़ास्ट आइटम से हटाएँ" },
  "No menu items added yet.": { en: "No menu items added yet.", hi: "अभी कोई मेनू आइटम नहीं जोड़ा गया।" },
  "No users added yet.": { en: "No users added yet.", hi: "अभी कोई उपयोगकर्ता नहीं जोड़ा गया।" },
  "Password (admin/laptop only)": {
    en: "Password (admin/laptop only)",
    hi: "पासवर्ड (केवल एडमिन/लैपटॉप)",
  },
  "Admin": { en: "Admin", hi: "एडमिन" },
  "Owner": { en: "Owner", hi: "मालिक" },
  "Waiter": { en: "Waiter", hi: "वेटर" },
  "Laptop": { en: "Laptop", hi: "लैपटॉप" },
  "Owner: bills + past bills. Laptop: print station (password 8855). Only Admin opens full Admin.": {
    en: "Owner: bills + past bills. Laptop: print station (password 8855). Only Admin opens full Admin.",
    hi: "मालिक: बिल + पुराने बिल। लैपटॉप: प्रिंट स्टेशन (पासवर्ड 8855)। पूरा एडमिन केवल एडमिन खोल सकता है।",
  },
  "Checking authorization...": { en: "Checking authorization...", hi: "अधिकार जाँच हो रही है..." },
  "Loading Admin...": { en: "Loading Admin...", hi: "एडमिन लोड हो रहा है..." },
  "Manage": { en: "Manage", hi: "प्रबंधन" },
  "Reports": { en: "Reports", hi: "रिपोर्ट" },
  "Today": { en: "Today", hi: "आज" },
  "Last 7 Days": { en: "Last 7 Days", hi: "पिछले 7 दिन" },
  "This Month": { en: "This Month", hi: "इस महीने" },
  "All Time": { en: "All Time", hi: "सभी समय" },
  "Print Report": { en: "Print Report", hi: "रिपोर्ट प्रिंट करें" },
  "Cash Drawer": { en: "Cash Drawer", hi: "कैश ड्रॉअर" },
  "Save Drawer": { en: "Save Drawer", hi: "ड्रॉअर सेव करें" },
  "Expenses": { en: "Expenses", hi: "खर्चे" },
  "Add Expense": { en: "Add Expense", hi: "खर्च जोड़ें" },
  "Amount": { en: "Amount", hi: "राशि" },
  "Description": { en: "Description", hi: "विवरण" },
  "e.g., Milk, Vegetables...": { en: "e.g., Milk, Vegetables...", hi: "जैसे दूध, सब्ज़ी..." },
  "No expenses recorded for this period.": {
    en: "No expenses recorded for this period.",
    hi: "इस अवधि में कोई खर्च दर्ज नहीं है।",
  },
  "No bills found for the selected time period.": {
    en: "No bills found for the selected time period.",
    hi: "चयनित अवधि में कोई बिल नहीं मिला।",
  },
  "Mark Paid": { en: "Mark Paid", hi: "भुगतान चिह्नित करें" },
  "Sync Data to JSON": { en: "Sync Data to JSON", hi: "डेटा JSON में सिंक करें" },
  "Sync Now": { en: "Sync Now", hi: "अभी सिंक करें" },

  // Receipt
  "Bill No": { en: "Bill No", hi: "बिल नंबर" },
  "Date": { en: "Date", hi: "तारीख" },
  "Table": { en: "Table", hi: "टेबल" },
  "Mode": { en: "Mode", hi: "मोड" },
  "Item": { en: "Item", hi: "आइटम" },
  "Qty": { en: "Qty", hi: "मात्रा" },
  "Rate": { en: "Rate", hi: "दर" },
  "Total": { en: "Total", hi: "कुल" },

  // Laptop board
  "Laptop Print Station": { en: "Laptop Print Station", hi: "लैपटॉप प्रिंट स्टेशन" },
  "Online for phones": { en: "Online for phones", hi: "फ़ोन के लिए ऑनलाइन" },
  "Not ready for phones": { en: "Not ready for phones", hi: "फ़ोन के लिए तैयार नहीं" },
  "Empty": { en: "Empty", hi: "खाली" },
  "Ongoing": { en: "Ongoing", hi: "चालू" },
  "Bill Ready": { en: "Bill Ready", hi: "बिल तैयार" },
  "Bill Ready — click to print": {
    en: "Bill Ready — click to print",
    hi: "बिल तैयार — प्रिंट करने के लिए क्लिक करें",
  },
  "Print": { en: "Print", hi: "प्रिंट" },
  "Print Bill": { en: "Print Bill", hi: "बिल प्रिंट करें" },
  "No printer connected": { en: "No printer connected", hi: "प्रिंटर कनेक्ट नहीं है" },
  "Printer connected & ready": { en: "Printer connected & ready", hi: "प्रिंटर कनेक्ट और तैयार" },
  "Detecting printer...": { en: "Detecting printer...", hi: "प्रिंटर खोजा जा रहा है..." },
  "Printing...": { en: "Printing...", hi: "प्रिंट हो रहा है..." },
  "Printed! Printer connected & ready": {
    en: "Printed! Printer connected & ready",
    hi: "प्रिंट हो गया! प्रिंटर तैयार है",
  },
  "Printed & cleared": { en: "Printed & cleared", hi: "प्रिंट हो गया और साफ़ किया" },
  "Marked ready (green)": { en: "Marked ready (green)", hi: "तैयार चिह्नित (हरा)" },
  "edit or print": { en: "edit or print", hi: "संपादित करें या प्रिंट करें" },
  "No items yet. Add from menu below.": {
    en: "No items yet. Add from menu below.",
    hi: "अभी कोई आइटम नहीं। नीचे मेनू से जोड़ें।",
  },
  "Use Chrome/Edge on this laptop to connect the USB printer.": {
    en: "Use Chrome/Edge on this laptop to connect the USB printer.",
    hi: "USB प्रिंटर जोड़ने के लिए इस लैपटॉप पर Chrome/Edge उपयोग करें।",
  },
  "Connect printer on this laptop first.": {
    en: "Connect printer on this laptop first.",
    hi: "पहले इस लैपटॉप पर प्रिंटर कनेक्ट करें।",
  },
  "Print failed": { en: "Print failed", hi: "प्रिंट असफल" },
  "Failed to save": { en: "Failed to save", hi: "सेव असफल" },
  "Billing & Thermal Printing": { en: "Billing & Thermal Printing", hi: "बिलिंग और थर्मल प्रिंटिंग" },
};

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  toggleLang: () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("app_lang") as Language;
    if (saved && (saved === "en" || saved === "hi")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLang(saved);
    }
  }, []);

  const toggleLang = () => {
    const nextLang = lang === "en" ? "hi" : "en";
    setLang(nextLang);
    localStorage.setItem("app_lang", nextLang);
  };

  const t = (key: string): string => {
    return translations[key]?.[lang] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
