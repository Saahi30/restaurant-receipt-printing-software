/**
 * One-time migration: push data.json into Supabase.
 * Usage: node --env-file=.env.local scripts/migrate-to-supabase.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const data = JSON.parse(readFileSync(resolve(root, "data.json"), "utf8"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (e.g. via --env-file=.env.local)");
  process.exit(1);
}

const sb = createClient(url, key);

async function upsert(table, rows) {
  if (!rows.length) return;
  const { error } = await sb.from(table).upsert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
}

const { error: sErr } = await sb.from("settings").upsert({
  id: 1,
  data: data.settings || {},
  updated_at: new Date().toISOString(),
});
if (sErr) throw sErr;

const { error: dErr } = await sb.from("drawer").upsert({
  id: 1,
  denominations: data.drawer || {},
  updated_at: new Date().toISOString(),
});
if (dErr) throw dErr;

await upsert(
  "categories",
  (data.categories || []).map((c) => ({ id: String(c.id), name: c.name }))
);
await upsert(
  "tables",
  (data.tables || []).map((t) => ({ id: String(t.id), name: t.name }))
);
await upsert(
  "menu_items",
  (data.menuItems || []).map((m) => ({
    id: String(m.id),
    category_id: m.categoryId,
    name: m.name,
    price: m.price,
    is_favorite: !!m.isFavorite,
  }))
);
await upsert(
  "app_users",
  (data.users || []).map((u) => ({
    id: String(u.id),
    username: u.username,
    password: u.password || "",
    role: u.role,
  }))
);
await upsert(
  "expenses",
  (data.expenses || []).map((e) => ({
    id: String(e.id),
    description: e.description || "",
    amount: e.amount || 0,
    expense_timestamp: e.timestamp || new Date().toISOString(),
  }))
);
await upsert(
  "bills",
  (data.bills || []).map((b) => ({
    id: String(b.id),
    order_number: b.orderNumber,
    table_number: b.tableNumber || null,
    order_type: b.orderType || null,
    payment_method: b.paymentMethod || null,
    customer_name: b.customerName || null,
    subtotal: b.subtotal || 0,
    tax_amount: b.taxAmount || 0,
    service_charge: b.serviceCharge || 0,
    discount_amount: b.discountAmount || 0,
    total_amount: b.totalAmount || 0,
    bill_timestamp: b.timestamp || null,
    data: b,
  }))
);

const counts = await Promise.all([
  sb.from("categories").select("*", { count: "exact", head: true }),
  sb.from("menu_items").select("*", { count: "exact", head: true }),
  sb.from("bills").select("*", { count: "exact", head: true }),
  sb.from("tables").select("*", { count: "exact", head: true }),
  sb.from("app_users").select("*", { count: "exact", head: true }),
]);

console.log("Migration complete:", {
  categories: counts[0].count,
  menu_items: counts[1].count,
  bills: counts[2].count,
  tables: counts[3].count,
  users: counts[4].count,
});
