/**
 * Replace categories + menu_items with bilingual Mahakal menu.
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
    hindi: "राईस",
    items: [
      { english: "Jeera Rice", hindi: "जीरा राईस", full_plate: 80, half_plate: 40 },
      { english: "Plain Rice", hindi: "राईस सादा", full_plate: 70, half_plate: 35 },
      { english: "Matar Pulao", hindi: "मटर पुलाव", price: 90 },
      { english: "Shahi Pulao", hindi: "शाही पुलाव", price: 100 },
      { english: "Kashmiri Pulao", hindi: "कश्मीरी पुलाव", price: 100 },
      { english: "Paneer Pulao", hindi: "पनीर पुलाव", price: 120 },
      { english: "Butter Khichdi", hindi: "बटर खिचड़ी", price: 120 },
      { english: "Veg Pulao", hindi: "वेज पुलाव", price: 100 },
    ],
  },
  beverages: {
    english: "Beverages",
    hindi: "पेय",
    items: [
      { english: "Plain Curd Plate", hindi: "दही प्लेट सादा", price: 70 },
      { english: "Boondi Raita", hindi: "बूंदी रायता", price: 80 },
      { english: "Buttermilk", hindi: "छाछ", price: 15 },
      { english: "Curd Lassi", hindi: "दही लस्सी", price: 50 },
      { english: "Fried Masala Curd", hindi: "दही फ्राई मसाला", price: 100 },
      { english: "Coffee", hindi: "कॉफी", price: 15 },
      { english: "Tea", hindi: "चाय", price: 10 },
    ],
  },
  papad_salad: {
    english: "Papad & Salads",
    hindi: "पापड़",
    items: [
      { english: "Roasted Papad", hindi: "पापड़ रोस्टेड", price: 15 },
      { english: "Masala Roasted Papad", hindi: "पापड़ रोस्टेड मसाला", price: 20 },
      { english: "Masala Fried Papad", hindi: "पापड़ फ्राई मसाला", price: 30 },
      { english: "Onion Lemon Salad", hindi: "सलाद (प्याज नींबू)", price: 20 },
      { english: "Green Salad", hindi: "ग्रीन सलाद", price: 50 },
      { english: "Tomato Salad", hindi: "टमाटर सलाद", price: 20 },
      { english: "Cucumber Salad", hindi: "ककड़ी सलाद", price: 20 },
      { english: "Kachumber Salad", hindi: "कचूमर सलाद", price: 30 },
    ],
  },
  roti_paratha: {
    english: "Roti & Paratha",
    hindi: "रोटी-पराठा",
    items: [
      { english: "Tawa Roti", hindi: "तवा रोटी", price: 8 },
      { english: "Butter Tawa Roti", hindi: "तवा रोटी बटर", price: 10 },
      { english: "Plain Paratha", hindi: "सादा पराठा", price: 15 },
      { english: "Butter Paratha", hindi: "बटर पराठा", price: 20 },
      { english: "Lachha Paratha", hindi: "लच्छा पराठा", price: 25 },
      { english: "Butter Lachha Paratha", hindi: "लच्छा बटर पराठा", price: 40 },
      { english: "Aloo Paratha", hindi: "आलू पराठा", price: 50 },
      { english: "Paneer Paratha", hindi: "पनीर पराठा", price: 50 },
      { english: "Cheese Paratha", hindi: "चीज पराठा", price: 40 },
      { english: "Methi Paratha", hindi: "मेथी पराठा", price: 30 },
      { english: "Sev Paratha", hindi: "सेव पराठा", price: 40 },
    ],
  },
  cashew_special: {
    english: "Cashew Special",
    hindi: "काजू स्पेशल",
    items: [
      { english: "Kaju Masala", hindi: "काजू मसाला", full_plate: 180, half_plate: 100 },
      { english: "Kaju Paneer", hindi: "काजू पनीर", full_plate: 170, half_plate: 90 },
      { english: "Kaju Curry", hindi: "काजू करी", full_plate: 170, half_plate: 90 },
      { english: "Kaju Fry", hindi: "काजू फ्राय", full_plate: 150, half_plate: null },
    ],
  },
  paneer_special: {
    english: "Paneer Special",
    hindi: "पनीर स्पेशल",
    items: [
      { english: "Matar Paneer", hindi: "मटर पनीर", full_plate: 120, half_plate: 70 },
      { english: "Shahi Paneer", hindi: "शाही पनीर", full_plate: 140, half_plate: 80 },
      { english: "Butter Paneer Masala", hindi: "बटर पनीर मसाला", full_plate: 150, half_plate: 80 },
      { english: "Kadai Paneer", hindi: "कड़ाई पनीर", full_plate: 140, half_plate: 80 },
      { english: "Sev Paneer", hindi: "सेव पनीर", full_plate: 120, half_plate: 70 },
      { english: "Paneer Masala", hindi: "पनीर मसाला", full_plate: 140, half_plate: 80 },
      { english: "Chilli Paneer", hindi: "चिल्ली पनीर", full_plate: 140, half_plate: null },
      { english: "Sev Tomato", hindi: "सेव टमाटर", full_plate: 90, half_plate: 50 },
      { english: "Sev Masala", hindi: "सेव मसाला", full_plate: 90, half_plate: 50 },
      { english: "Sev Doodh", hindi: "सेव दूध", full_plate: 100, half_plate: 70 },
    ],
  },
  dal: {
    english: "Dal",
    hindi: "दाल",
    items: [
      { english: "Dal Fry", hindi: "दाल फ्राय", full_plate: 90, half_plate: 50 },
      { english: "Dal Tadka", hindi: "दाल तड़का", full_plate: 100, half_plate: 60 },
      { english: "Garlic Dal", hindi: "लहसुनी दाल", full_plate: 100, half_plate: 60 },
      { english: "Dal Bhawani", hindi: "दाल भवानी", full_plate: 120, half_plate: 70 },
      { english: "Jeera Dal", hindi: "जीरा दाल", full_plate: 90, half_plate: 50 },
      { english: "Dal Palak", hindi: "दाल पालक", full_plate: 90, half_plate: 50 },
      { english: "Methi Matar Malai", hindi: "मेथी मटर मलाई", full_plate: 120, half_plate: 70 },
      { english: "Matar Malai", hindi: "मटर मलाई", full_plate: 120, half_plate: 70 },
      { english: "Matar Aloo", hindi: "मटर आलू", full_plate: 90, half_plate: 50 },
    ],
  },
  vegetables: {
    english: "Vegetables",
    hindi: "सब्जियां",
    items: [
      { english: "Matar Aloo Tomato", hindi: "मटर आलू टमाटर", full_plate: 90, half_plate: 50 },
      { english: "Aloo Tomato", hindi: "आलू टमाटर", full_plate: 90, half_plate: 50 },
      { english: "Jeera Aloo", hindi: "आलू जीरा", full_plate: 100, half_plate: 60 },
      { english: "Aloo Gobi", hindi: "आलू गोभी", full_plate: 90, half_plate: 50 },
      { english: "Mix Veg", hindi: "मिक्स वेज", full_plate: 120, half_plate: null },
      { english: "Aloo Capsicum", hindi: "आलू शिमला मिर्च", full_plate: 100, half_plate: null },
      { english: "Bhindi Masala", hindi: "भिंडी मसाला", full_plate: 100, half_plate: null },
      { english: "Aloo Bhindi Mix", hindi: "आलू भिंडी मिक्स", full_plate: 100, half_plate: null },
      { english: "Aloo Chole", hindi: "आलू छोले", full_plate: 100, half_plate: 60 },
      { english: "Green Chana Masala", hindi: "चना मसाला (हरे चने)", full_plate: 120, half_plate: 70 },
      { english: "Malai Kofta", hindi: "मलाई कोफ्ता", full_plate: 150, half_plate: 80 },
      { english: "Baingan Gatta", hindi: "बैंगन गट्टा", full_plate: 100, half_plate: 70 },
    ],
  },
};

const FULL_HI = "फुल";
const HALF_HI = "हाफ";

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

let seq = Date.now();
const nextId = () => String(++seq);

const categories = [];
const menuItems = [];

for (const cat of Object.values(menu)) {
  const catId = nextId();
  categories.push({ id: catId, name: cat.english, name_hi: cat.hindi });

  for (const item of cat.items) {
    if (item.price != null) {
      menuItems.push({
        id: nextId(),
        category_id: catId,
        name: item.english,
        name_hi: item.hindi,
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
        name_hi: `${item.hindi} (${FULL_HI})`,
        price: item.full_plate,
        is_favorite: false,
      });
    }
    if (item.half_plate != null) {
      menuItems.push({
        id: nextId(),
        category_id: catId,
        name: `${item.english} (Half)`,
        name_hi: `${item.hindi} (${HALF_HI})`,
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

console.log(`Seeded ${categories.length} categories, ${menuItems.length} menu items (with Hindi names).`);
