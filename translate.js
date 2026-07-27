const fs = require('fs');

const dictionary = [
  "Billing", "Settings", "Admin Access", "Logout", "Disconnect", "Detect Printer",
  "Select an account to login", "Admin Login", "Password", "Enter password", "Login",
  "Back", "Select Table", "Customer Name (Optional)", "Customer Name", "Payment",
  "Menu Categories", "No items in this category.", "Select a category to view items.",
  "Search items...", "Current Bill", "Select a table first to start billing",
  "Empty Bill", "Add items from the menu", "Subtotal", "Tax", "Grand Total",
  "Save Bill", "Print Receipt", "Thermal Print", "Preview", "App Settings",
  "Restaurant Name", "Tagline", "Address", "Phone", "Currency Symbol", "Tax Rate (%)",
  "UPI ID", "Footer Text", "About Us (Printed on receipt)", "Save Settings", "Saving...",
  "Settings saved successfully!", "Dashboard", "Menu Management", "Users", "Data Sync",
  "Back to Billing", "Admin Dashboard", "Manage menu, categories, and tables",
  "Overview", "Total Categories", "Total Menu Items", "Total Tables", "Tables",
  "Categories", "Add New Item", "Price", "Actions", "Delete", "Sync Data to JSON",
  "Sync Now"
];

function translateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Need to be very careful to only match text nodes or string literals where appropriate.
  // 1. >Text< => >{t("Text")}<
  // 2. placeholder="Text" => placeholder={t("Text")}
  
  for (const key of dictionary) {
    // Escape regex characters
    const escapedKey = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    // Regex 1: >Key<
    const regex1 = new RegExp(`>\\s*${escapedKey}\\s*<`, 'g');
    content = content.replace(regex1, `>{t("${key}")}<`);

    // Regex 2: placeholder="Key"
    const regex2 = new RegExp(`placeholder="${escapedKey}"`, 'g');
    content = content.replace(regex2, `placeholder={t("${key}")}`);
    
    // Regex 3: placeholder='Key'
    const regex3 = new RegExp(`placeholder='${escapedKey}'`, 'g');
    content = content.replace(regex3, `placeholder={t("${key}")}`);
    
    // Regex 4: >Key (if there's an icon before it like <Icon /> Key<)
    // Actually, handling `> Key<` and `> Key <` is better.
    const regex4 = new RegExp(`>\\s*${escapedKey}\\s*<`, 'g');
    // Already covered.
    
    // Sometimes text is mixed with variables like <Icon /> Settings
    const regex5 = new RegExp(`>\\s*${escapedKey}\\s*`, 'g');
    // But this is dangerous, could match `>Settings/>`
    // Let's do a safer pass:
    // Regex 6: >\s*Key\s*<
    
    // What if it's like <Icon /> Admin Access
    // In JSX it usually looks like `> Admin Access\n`
    const regex6 = new RegExp(`>(\\s*)${escapedKey}(\\s*)<`, 'g');
    content = content.replace(regex6, `>$1{t("${key}")}$2<`);
  }

  // Also replace some specific known patterns that might miss
  content = content.replace(/> Admin Access/g, '> {t("Admin Access")}');
  content = content.replace(/> Billing/g, '> {t("Billing")}');
  content = content.replace(/> Settings/g, '> {t("Settings")}');
  content = content.replace(/> Logout/g, '> {t("Logout")}');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Translated ${filePath}`);
}

translateFile('c:/Users/admin/Downloads/restaurant-receipt-printing-software/src/app/page.tsx');
translateFile('c:/Users/admin/Downloads/restaurant-receipt-printing-software/src/app/admin/page.tsx');
