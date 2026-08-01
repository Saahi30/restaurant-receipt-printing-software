/**
 * One-shot seed: replace categories + menu_items with the Mahakal menu.
 * Run: node scripts/seed-menu.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const raw = readFileSync(resolve(".env.local"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const menu = {
  rice: {
    english: "Rice",
    items: [
      { english: "Jeera Rice", price: 80 },
      { english: "Plain Rice", price: 70 },
      { english: "Matar Pulao", price: 90 },
      { english: "Shahi Pulao", price: 100 },
      { english: "Kashmiri Pulao", price: 100 },
      { english: "Paneer Pulao", price: 120 },
      { english: "Butter Khichdi", price: 120 },
      { english: "Veg Pulao", price: 100 },
    ],
  },
  beverages: {
    english: "Beverages",
    items: [
      { english: "Plain Curd Plate", price: 70 },
      { english: "Boondi Raita", price: 80 },
      { english: "Buttermilk", price: 15 },
      { english: "Curd Lassi", price: 50 },
      { english: "Fried Masala Curd", price: 100 },
    ],
  },
  papad_salad: {
    english: "Papad & Salads",
    items: [
      { english: "Roasted Papad", price: 15 },
      { english: "Masala Roasted Papad", price: 20 },
      { english: "Masala Fried Papad", price: 30 },
      { english: "Onion Lemon Salad", price: 20 },
      { english: "Green Salad", price: 50 },
      { english: "Tomato Salad", price: 20 },
      { english: "Cucumber Salad", price: 20 },
      { english: "Kachumber Salad", price: 30 },
    ],
  },
  roti_paratha: {
    english: "Roti & Paratha",
    items: [
      { english: "Tawa Roti", price: 8 },
      { english: "Butter Tawa Roti", price: 10 },
      { english: "Plain Paratha", price: 15 },
      { english: "Butter Paratha", price: 20 },
      { english: "Lachha Paratha", price: 25 },
      { english: "Butter Lachha Paratha", price: 40 },
      { english: "Aloo Paratha", price: 50 },
      { english: "Paneer Paratha", price: 50 },
      { english: "Cheese Paratha", price: 40 },
      { english: "Methi Paratha", price: 30 },
      { english: "Sev Paratha", price: 40 },
    ],
  },
  cashew_special: {
    english: "Cashew Special",
    items: [
      { english: "Kaju Masala", full_plate: 180, half_plate: 100 },
      { english: "Kaju Paneer", full_plate: 170, half_plate: 90 },
      { english: "Kaju Curry", full_plate: 170, half_plate: 90 },
      { english: "Kaju Fry", full_plate: 150, half_plate: null },
    ],
  },
  paneer_special: {
    english: "Paneer Special",
    items: [
      { english: "Matar Paneer", full_plate: 120, half_plate: 70 },
      { english: "Shahi Paneer", full_plate: 140, half_plate: 80 },
      { english: "Butter Paneer Masala", full_plate: 150, half_plate: 80 },
      { english: "Kadai Paneer", full_plate: 140, half_plate: 80 },
      { english: "Sev Paneer", full_plate: 120, half_plate: 70 },
      { english: "Paneer Masala", full_plate: 140, half_plate: 80 },
      { english: "Chilli Paneer", full_plate: 140, half_plate: null },
      { english: "Sev Tomato", full_plate: 90, half_plate: 50 },
      { english: "Sev Masala", full_plate: 90, half_plate: 50 },
      { english: "Sev Doodh", full_plate: 100, half_plate: 70 },
    ],
  },
  dal: {
    english: "Dal",
    items: [
      { english: "Dal Fry", full_plate: 90, half_plate: 50 },
      { english: "Dal Tadka", full_plate: 100, half_plate: 60 },
      { english: "Garlic Dal", full_plate: 100, half_plate: 60 },
      { english: "Dal Bhawani", full_plate: 120, half_plate: 70 },
      { english: "Jeera Dal", full_plate: 90, half_plate: 50 },
      { english: "Dal Palak", full_plate: 90, half_plate: 50 },
      { english: "Methi Matar Malai", full_plate: 120, half_plate: 70 },
      { english: "Matar Malai", full_plate: 120, half_plate: 70 },
      { english: "Matar Aloo", full_plate: 90, half_plate: 50 },
    ],
  },
  vegetables: {
    english: "Vegetables",
    items: [
      { english: "Matar Aloo Tomato", full_plate: 90, half_plate: 50 },
      { english: "Aloo Tomato", full_plate: 90, half_plate: 50 },
      { english: "Jeera Aloo", full_plate: 100, half_plate: 60 },
      { english: "Aloo Gobi", full_plate: 90, half_plate: 50 },
      { english: "Mix Veg", full_plate: 120, half_plate: null },
      { english: "Aloo Capsicum", full_plate: 100, half_plate: null },
      { english: "Bhindi Masala", full_plate: 100, half_plate: null },
      { english: "Aloo Bhindi Mix", full_plate: 100, half_plate: null },
      { english: "Aloo Chole", full_plate: 100, half_plate: 60 },
      { english: "Green Chana Masala", full_plate: 120, half_plate: 70 },
      { english: "Malai Kofta", full_plate: 150, half_plate: 80 },
      { english: "Baingan Gatta", full_plate: 100, half_plate: 70 },
    ],
  },
};

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

let seq = Date.now();
const nextId = () => String(++seq);

const categories = [];
const menuItems = [];

for (const [key, cat] of Object.entries(menu)) {
  const catId = nextId();
  categories.push({ id: catId, name: cat.english });

  for (const item of cat.items) {
    if (item.price != null) {
      menuItems.push({
        id: nextId(),
        category_id: catId,
        name: item.english,
        price: item.price,
        is_favorite: false,
      });
      continue;
    }
    if (item.full_plate != null) {
      menuItems.push({
        id: nextId(),
        category_id: catId,
        name: `${item.english} (Full)`,
        price: item.full_plate,
        is_favorite: false,
      });
    }
    if (item.half_plate != null) {
      menuItems.push({
        id: nextId(),
        category_id: catId,
        name: `${item.english} (Half)`,
        price: item.half_plate,
        is_favorite: false,
      });
    }
  }
}

const { error: delMenu } = await supabase.from("menu_items").delete().neq("id", "__never__");
if (delMenu) throw delMenu;

const { error: delCat } = await supabase.from("categories").delete().neq("id", "__never__");
if (delCat) throw delCat;

const { error: insCat } = await supabase.from("categories").insert(categories);
if (insCat) throw insCat;

const { error: insMenu } = await supabase.from("menu_items").insert(menuItems);
if (insMenu) throw insMenu;

console.log(`Seeded ${categories.length} categories, ${menuItems.length} menu items.`);
