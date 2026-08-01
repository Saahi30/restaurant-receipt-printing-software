"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "hi";

export const translations: Record<string, Record<Language, string>> = {
  // Navigation & General
  "Billing": { en: "Billing", hi: "Billing (बिलिंग)" },
  "Settings": { en: "Settings", hi: "Settings (सेटिंग्स)" },
  "Admin Access": { en: "Admin Access", hi: "Admin Access" },
  "Logout": { en: "Logout", hi: "Logout (लॉगआउट)" },
  "Disconnect": { en: "Disconnect", hi: "Disconnect" },
  "Detect Printer": { en: "Detect Printer", hi: "Printer Detect Karein" },
  
  // Login Page
  "Select an account to login": { en: "Select an account to login", hi: "Login ke liye account chunein" },
  "Admin Login": { en: "Admin Login", hi: "Admin Login" },
  "Password": { en: "Password", hi: "Password (पासवर्ड)" },
  "Enter password": { en: "Enter password", hi: "Password darj karein" },
  "Login": { en: "Login", hi: "Login Karein" },
  "Past Bills": { en: "Past Bills", hi: "Purane Bills" },
  "Back": { en: "Back", hi: "Wapas (Back)" },
  "Use Fingerprint": { en: "Use Fingerprint", hi: "Fingerprint use karein" },
  "or use password": { en: "or use password", hi: "ya password use karein" },
  "Fingerprint failed. Try password.": { en: "Fingerprint failed. Try password.", hi: "Fingerprint fail hua. Password try karein." },
  "Set up Fingerprint": { en: "Set up Fingerprint", hi: "Fingerprint set karein" },
  "Skip for now": { en: "Skip for now", hi: "Abhi skip karein" },
  "Use fingerprint next time on this phone": {
    en: "Use fingerprint next time on this phone?",
    hi: "Is phone par agli baar fingerprint use karein?",
  },
  "Fingerprint enabled": { en: "Fingerprint enabled", hi: "Fingerprint enable ho gaya" },
  "Fingerprint setup failed": { en: "Fingerprint setup failed", hi: "Fingerprint setup fail hua" },
  "Fingerprint needs HTTPS": {
    en: "Fingerprint needs HTTPS on this device",
    hi: "Fingerprint ke liye HTTPS chahiye",
  },

  // Billing Tab - Top Area
  "Select Table": { en: "Select Table", hi: "Table Chunein (Select Table)" },
  "Customer Name (Optional)": { en: "Customer Name (Optional)", hi: "Customer ka Naam (Optional)" },
  "Customer Name": { en: "Customer Name", hi: "Customer ka Naam" },
  "Payment": { en: "Payment", hi: "Payment" },
  
  // Billing Tab - Menu Area
  "Menu Categories": { en: "Menu Categories", hi: "Menu Categories" },
  "No items in this category.": { en: "No items in this category.", hi: "Is category mein koi item nahi hai." },
  "Select a category to view items.": { en: "Select a category to view items.", hi: "Items dekhne ke liye category chunein." },
  "Search items...": { en: "Search items...", hi: "Items search karein..." },

  // Billing Tab - Cart Area
  "Current Bill": { en: "Current Bill", hi: "Current Bill" },
  "Select a table first to start billing": { en: "Select a table first to start billing", hi: "Billing shuru karne ke liye pehle table chunein" },
  "Empty Bill": { en: "Empty Bill", hi: "Bill Khali Hai" },
  "Add items from the menu": { en: "Add items from the menu", hi: "Menu se items add karein" },
  "Subtotal": { en: "Subtotal", hi: "Subtotal" },
  "Tax": { en: "Tax", hi: "Tax" },
  "Grand Total": { en: "Grand Total", hi: "Grand Total" },
  "Save Bill": { en: "Save Bill", hi: "Bill Save Karein" },
  "Print Receipt": { en: "Print Receipt", hi: "Receipt Print Karein" },
  "Thermal Print": { en: "Thermal Print", hi: "Thermal Print" },
  "Preview": { en: "Preview", hi: "Preview Dekhein" },
  
  // Settings Tab
  "App Settings": { en: "App Settings", hi: "App Settings" },
  "Restaurant Name": { en: "Restaurant Name", hi: "Restaurant ka Naam" },
  "Tagline": { en: "Tagline", hi: "Tagline" },
  "Address": { en: "Address", hi: "Pata (Address)" },
  "Phone": { en: "Phone", hi: "Phone Number" },
  "Currency Symbol": { en: "Currency Symbol", hi: "Currency Symbol" },
  "Tax Rate (%)": { en: "Tax Rate (%)", hi: "Tax Rate (%)" },
  "UPI ID": { en: "UPI ID", hi: "UPI ID" },
  "Footer Text": { en: "Footer Text", hi: "Footer Text" },
  "About Us (Printed on receipt)": { en: "About Us (Printed on receipt)", hi: "About Us (Receipt par print hoga)" },
  "Save Settings": { en: "Save Settings", hi: "Settings Save Karein" },
  "Saving...": { en: "Saving...", hi: "Save ho raha hai..." },
  "Settings saved successfully!": { en: "Settings saved successfully!", hi: "Settings save ho gayi!" },

  // Admin Dashboard
  "Dashboard": { en: "Dashboard", hi: "Dashboard" },
  "Menu Management": { en: "Menu Management", hi: "Menu Management" },
  "Users": { en: "Users", hi: "Users" },
  "Data Sync": { en: "Data Sync", hi: "Data Sync" },
  "Back to Billing": { en: "Back to Billing", hi: "Billing par Wapas Jayein" },
  "Admin Dashboard": { en: "Admin Dashboard", hi: "Admin Dashboard" },
  "Manage menu, categories, and tables": { en: "Manage menu, categories, and tables", hi: "Menu, categories aur tables manage karein" },
  "Overview": { en: "Overview", hi: "Overview" },
  "Total Categories": { en: "Total Categories", hi: "Total Categories" },
  "Total Menu Items": { en: "Total Menu Items", hi: "Total Menu Items" },
  "Total Tables": { en: "Total Tables", hi: "Total Tables" },
  
  // Admin Data Management
  "Tables": { en: "Tables", hi: "Tables" },
  "Categories": { en: "Categories", hi: "Categories" },
  "Add New Item": { en: "Add New Item", hi: "Naya Item Add Karein" },
  "Price": { en: "Price", hi: "Price" },
  "Actions": { en: "Actions", hi: "Actions" },
  "Delete": { en: "Delete", hi: "Delete Karein" },
  "Sync Data to JSON": { en: "Sync Data to JSON", hi: "Data JSON mein Sync Karein" },
  "Sync Now": { en: "Sync Now", hi: "Abhi Sync Karein" },
  
  // Receipt
  "Bill No": { en: "Bill No", hi: "Bill Number" },
  "Date": { en: "Date", hi: "Taarikh (Date)" },
  "Table": { en: "Table", hi: "Table" },
  "Mode": { en: "Mode", hi: "Mode" },
  "Item": { en: "Item", hi: "Item" },
  "Qty": { en: "Qty", hi: "Qty" },
  "Rate": { en: "Rate", hi: "Rate" },
  "Total": { en: "Total", hi: "Total" }
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

  // Persist language preference
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
