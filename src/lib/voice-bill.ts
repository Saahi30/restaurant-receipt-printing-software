export type VoiceMenuItem = {
  id: string;
  name: string;
  nameHi?: string;
  price: number;
};

export type VoiceTable = {
  id: string;
  name: string;
};

export type VoiceParsedLine = {
  spoken: string;
  quantity: number;
  menuItem: VoiceMenuItem;
  alternatives: VoiceMenuItem[];
  ambiguous: boolean;
};

export type VoiceParseResult = {
  transcript: string;
  lines: VoiceParsedLine[];
  unmatched: string[];
  tableHint?: { kind: "parcel" } | { kind: "table"; id: string; name: string };
  paymentHint?: "Cash" | "UPI" | "Udhaar";
  customerName?: string;
};

const GENERIC_TOKENS = new Set([
  "plain",
  "regular",
  "normal",
  "simple",
  "sadha",
  "veg",
  "special",
  "hot",
  "full",
  "new",
]);

const FILLERS = new Set([
  "ji",
  "bhai",
  "bhaiya",
  "please",
  "pls",
  "ok",
  "okay",
  "the",
  "a",
  "an",
  "of",
  "for",
  "with",
  "and",
  "then",
  "plus",
  "also",
  "aur",
  "or",
  "ke",
  "ki",
  "ka",
  "ko",
  "se",
  "mein",
  "me",
  "mai",
  "pe",
  "par",
  "wala",
  "wale",
  "wali",
  "plate",
  "plates",
  "piece",
  "pieces",
  "pcs",
  "pc",
  "order",
  "bill",
  "banao",
  "banana",
  "dena",
  "dijiye",
  "chahiye",
  "chahie",
  "saath",
  "only",
  "bas",
  "sir",
  "madam",
  "kr",
  "kar",
]);

/** Spoken / Devanagari tokens → latin menu tokens or digits. */
const WORD_MAP: Record<string, string> = {
  // numbers
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  eleven: "11",
  twelve: "12",
  fifteen: "15",
  twenty: "20",
  ek: "1",
  do: "2",
  teen: "3",
  tin: "3",
  char: "4",
  chaar: "4",
  panch: "5",
  paanch: "5",
  chhe: "6",
  che: "6",
  chhah: "6",
  saat: "7",
  aath: "8",
  ath: "8",
  nau: "9",
  das: "10",
  gyarah: "11",
  barah: "12",
  pandrah: "15",
  bees: "20",
  tees: "30",
  "एक": "1",
  "दो": "2",
  "तीन": "3",
  "चार": "4",
  "पांच": "5",
  "पाँच": "5",
  "छह": "6",
  "छः": "6",
  "सात": "7",
  "आठ": "8",
  "नौ": "9",
  "दस": "10",
  "ग्यारह": "11",
  "बारह": "12",
  "तेरह": "13",
  "चौदह": "14",
  "पंद्रह": "15",
  "पन्द्रह": "15",
  "बीस": "20",
  "पच्चीस": "25",
  "तीस": "30",
  "एकदम": "",

  // connectors / fillers (dropped)
  "और": "",
  aur: "",
  and: "",
  plus: "",
  then: "",
  also: "",
  "फिर": "",
  "तथा": "",
  "व": "",
  "एंड": "",
  please: "",
  ji: "",
  "जी": "",
  bhai: "",
  "भाई": "",
  "प्लेट": "",
  plate: "",
  plates: "",
  piece: "",
  pieces: "",
  "पीस": "",
  "नंबर": "number",
  number: "number",
  no: "number",
  num: "number",

  // table / parcel / payment
  "टेबल": "table",
  table: "table",
  "टेबलनंबर": "table",
  "पार्सल": "parcel",
  parcel: "parcel",
  parsal: "parcel",
  takeaway: "parcel",
  "टेकअवे": "parcel",
  "पार्सलमें": "parcel",
  cash: "cash",
  "कैश": "cash",
  "नकद": "cash",
  "नगद": "cash",
  upi: "upi",
  "यूपीआई": "upi",
  gpay: "upi",
  phonepe: "upi",
  paytm: "upi",
  udhaar: "udhaar",
  udhar: "udhaar",
  "उधार": "udhaar",
  khata: "udhaar",
  "खाता": "udhaar",
  "उधारी": "udhaar",

  // customer markers
  naam: "name",
  name: "name",
  "नाम": "name",
  customer: "customer",
  "ग्राहक": "customer",
  liye: "liye",
  "लिए": "liye",
  keliye: "liye",
  "केलिए": "liye",
  "के": "",
  "की": "",
  "का": "",
  "को": "",
  "से": "",
  "में": "",
  "पे": "",
  "पर": "",
  "है": "",
  "हैं": "",

  // food synonyms so Hindi speech matches English menu names
  "रोटी": "roti",
  "रोटि": "roti",
  "रोटियां": "roti",
  "रोटियाँ": "roti",
  rotian: "roti",
  rotis: "roti",
  chapati: "roti",
  chappati: "roti",
  "चपाती": "roti",
  "चपाति": "roti",
  "नान": "naan",
  nan: "naan",
  naan: "naan",
  "पराठा": "paratha",
  "पराठे": "paratha",
  paratha: "paratha",
  parathe: "paratha",
  "बटर": "butter",
  makhan: "butter",
  "मक्खन": "butter",
  "सादा": "plain",
  sadha: "plain",
  plain: "plain",
  "दाल": "dal",
  daal: "dal",
  dal: "dal",
  "तड़का": "tadka",
  "तडका": "tadka",
  tadka: "tadka",
  tarka: "tadka",
  "फ्राई": "fry",
  fry: "fry",
  "पनीर": "paneer",
  panir: "paneer",
  paneer: "paneer",
  "चावल": "rice",
  chawal: "rice",
  rice: "rice",
  "बिरयानी": "biryani",
  biryani: "biryani",
  biriyani: "biryani",
  "पुलाव": "pulao",
  pulao: "pulao",
  pulav: "pulao",
  "चिकन": "chicken",
  chicken: "chicken",
  murgh: "chicken",
  "मुर्गी": "chicken",
  "मटन": "mutton",
  mutton: "mutton",
  "अंडा": "egg",
  "अंडे": "egg",
  anda: "egg",
  ande: "egg",
  egg: "egg",
  eggs: "egg",
  "सब्जी": "sabzi",
  "सब्ज़ी": "sabzi",
  sabji: "sabzi",
  sabzi: "sabzi",
  "सलाद": "salad",
  salad: "salad",
  "रायता": "raita",
  raita: "raita",
  "पापड़": "papad",
  papad: "papad",
  papadum: "papad",
  "पानी": "water",
  pani: "water",
  water: "water",
  "चाय": "chai",
  chai: "chai",
  tea: "chai",
  "कॉफी": "coffee",
  coffee: "coffee",
  "लस्सी": "lassi",
  lassi: "lassi",
  "ठाडा": "cold",
  "ठंडा": "cold",
  thanda: "cold",
  cold: "cold",
  drink: "drink",
  drinks: "drink",
  colddrink: "colddrink",
  "कोल्डड्रिंक": "colddrink",
  coke: "coke",
  "कोक": "coke",
  pepsi: "pepsi",
  "पेप्सी": "pepsi",
  sprite: "sprite",
  "मखाना": "makhani",
  makhani: "makhani",
  "माखनी": "makhani",
  "मसाला": "masala",
  masala: "masala",
  "तंदूरी": "tandoori",
  tandoori: "tandoori",
  "छोले": "chole",
  chole: "chole",
  chola: "chole",
  "चना": "chana",
  "राजमा": "rajma",
  rajma: "rajma",
  "कढ़ी": "kadhi",
  kadhi: "kadhi",
  "कड़ी": "kadhi",
  "थाली": "thali",
  thali: "thali",
  "सूप": "soup",
  soup: "soup",
  "मंचूरियन": "manchurian",
  manchurian: "manchurian",
  "चाउमीन": "chowmein",
  chowmein: "chowmein",
  chowmin: "chowmein",
  "फ्राइड": "fried",
  fried: "fried",
  "चिली": "chilli",
  chilli: "chilli",
  chili: "chilli",
  "गुलाब": "gulab",
  gulab: "gulab",
  jamun: "jamun",
  "जामुन": "jamun",
};

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function setHasFuzzy(set: Set<string>, token: string): boolean {
  if (set.has(token)) return true;
  if (token.length < 4) return false;
  for (const s of set) {
    if (Math.abs(s.length - token.length) > 1) continue;
    if (editDistance(s, token) <= 1) return true;
  }
  return false;
}

export function foldSpoken(text: string): string {
  let t = (text || "").toLowerCase().normalize("NFC");
  t = t.replace(/[०-९]/g, (ch) => String(DEVANAGARI_DIGITS.indexOf(ch)));
  t = t.replace(/([a-z\u0900-\u097f]+)(\d+)/gi, "$1 $2");
  t = t.replace(/(\d+)([a-z\u0900-\u097f]+)/gi, "$1 $2");
  t = t.replace(/[^\d\s\u0900-\u097fa-z]+/gi, " ");
  const words = t.split(/\s+/).filter(Boolean);
  const mapped: string[] = [];
  for (const w of words) {
    if (WORD_MAP[w] !== undefined) {
      if (WORD_MAP[w] !== "") mapped.push(WORD_MAP[w]);
    } else if (!FILLERS.has(w)) {
      mapped.push(w);
    }
  }
  return mapped.join(" ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return foldSpoken(text).split(" ").filter(Boolean);
}

function isQtyToken(token: string): boolean {
  return /^\d{1,3}$/.test(token) && Number(token) >= 1 && Number(token) <= 999;
}

function extraRank(itemTokens: string[], phraseTokens: string[], price: number): number {
  const phrase = new Set(phraseTokens);
  let rank = 0;
  for (const t of itemTokens) {
    if (phrase.has(t)) continue;
    rank += GENERIC_TOKENS.has(t) ? 1 : 12;
  }
  return rank * 1000 + price;
}

type IndexedItem = {
  item: VoiceMenuItem;
  tokens: string[];
  tokenSet: Set<string>;
};

function indexMenu(menuItems: VoiceMenuItem[]): IndexedItem[] {
  return menuItems.map((item) => {
    const tokens = [
      ...tokenize(item.name),
      ...tokenize(item.nameHi || ""),
    ].filter((t) => !isQtyToken(t) && t !== "number");
    const unique = Array.from(new Set(tokens));
    return { item, tokens: unique, tokenSet: new Set(unique) };
  });
}

function windowMatches(index: IndexedItem, phrase: string[]): boolean {
  if (phrase.length === 0) return false;
  return phrase.every((t) => setHasFuzzy(index.tokenSet, t));
}

function extractMeta(
  folded: string,
  tables: VoiceTable[]
): {
  rest: string;
  tableHint?: VoiceParseResult["tableHint"];
  paymentHint?: VoiceParseResult["paymentHint"];
  customerName?: string;
} {
  let rest = ` ${folded} `;
  let tableHint: VoiceParseResult["tableHint"];
  let paymentHint: VoiceParseResult["paymentHint"];
  let customerName: string | undefined;

  if (/\bparcel\b/.test(rest)) {
    tableHint = { kind: "parcel" };
    rest = rest.replace(/\bparcel\b/g, " ");
  }

  const tableMatch =
    rest.match(/\btable(?: number)? (\d{1,3})\b/) ||
    rest.match(/\b(\d{1,3}) (?:number )?table\b/);
  if (tableMatch) {
    const num = tableMatch[1];
    const tbl =
      tables.find((t) => foldSpoken(t.name) === `table ${num}`) ||
      tables.find((t) => foldSpoken(t.name).split(" ").includes(num));
    if (tbl) tableHint = { kind: "table", id: tbl.id, name: tbl.name };
    rest = rest.replace(tableMatch[0], " ");
  }

  if (/\budhaar\b/.test(rest)) {
    paymentHint = "Udhaar";
    rest = rest.replace(/\budhaar\b/g, " ");
  } else if (/\bupi\b/.test(rest)) {
    paymentHint = "UPI";
    rest = rest.replace(/\bupi\b/g, " ");
  } else if (/\bcash\b/.test(rest)) {
    paymentHint = "Cash";
    rest = rest.replace(/\bcash\b/g, " ");
  }

  const nameAfter =
    rest.match(/\b(?:name|customer)\s+([a-z\u0900-\u097f]{2,})\b/) ||
    rest.match(/\b([a-z\u0900-\u097f]{2,})\s+liye\b/);
  if (nameAfter) {
    const raw = nameAfter[1];
    if (!isQtyToken(raw) && raw !== "table" && raw !== "parcel") {
      customerName = raw.charAt(0).toUpperCase() + raw.slice(1);
      rest = rest.replace(nameAfter[0], " ");
    }
  }

  rest = rest.replace(/\bnumber\b/g, " ").replace(/\s+/g, " ").trim();
  return { rest, tableHint, paymentHint, customerName };
}

/**
 * Parse Hindi / Hinglish speech into menu lines.
 * Example: "do butter roti aur ek dal tadka table 2 cash"
 */
export function parseVoiceOrder(
  transcript: string,
  menuItems: VoiceMenuItem[],
  tables: VoiceTable[] = []
): VoiceParseResult {
  const folded = foldSpoken(transcript);
  const meta = extractMeta(folded, tables);
  const tokens = meta.rest.split(" ").filter(Boolean);
  const indexed = indexMenu(menuItems);

  const lines: VoiceParsedLine[] = [];
  const unmatchedParts: string[] = [];
  let pendingUnmatched: string[] = [];

  const flushUnmatched = () => {
    if (pendingUnmatched.length) {
      unmatchedParts.push(pendingUnmatched.join(" "));
      pendingUnmatched = [];
    }
  };

  let i = 0;
  while (i < tokens.length) {
    let quantity = 1;
    if (isQtyToken(tokens[i])) {
      quantity = Number(tokens[i]);
      i += 1;
      if (i >= tokens.length) {
        pendingUnmatched.push(String(quantity));
        break;
      }
    }

    let bestLen = 0;
    let bestMatches: IndexedItem[] = [];
    for (let end = i + 1; end <= tokens.length; end++) {
      // A following quantity starts the next line ("2 roti 3 dal").
      if (end > i + 1 && isQtyToken(tokens[end - 1])) break;
      const phrase = tokens.slice(i, end).filter((t) => !isQtyToken(t));
      if (phrase.length === 0) continue;
      const matches = indexed.filter((idx) => windowMatches(idx, phrase));
      if (matches.length > 0) {
        bestLen = end - i;
        bestMatches = matches;
      }
    }

    if (bestLen === 0) {
      pendingUnmatched.push(tokens[i]);
      i += 1;
      continue;
    }

    const phrase = tokens.slice(i, i + bestLen).filter((t) => !isQtyToken(t));
    const ranked = [...bestMatches].sort(
      (a, b) => extraRank(a.tokens, phrase, a.item.price) - extraRank(b.tokens, phrase, b.item.price)
    );
    const uniqueById = new Map<string, VoiceMenuItem>();
    for (const r of ranked) uniqueById.set(r.item.id, r.item);
    const items = Array.from(uniqueById.values());
    const chosen = items[0];
    const alternatives = items.slice(1, 5);
    const spoken = (quantity !== 1 ? `${quantity} ` : "") + phrase.join(" ");

    flushUnmatched();
    const existing = lines.find((l) => l.menuItem.id === chosen.id);
    if (existing) existing.quantity = Math.min(999, existing.quantity + quantity);
    else {
      lines.push({
        spoken,
        quantity,
        menuItem: chosen,
        alternatives,
        ambiguous: alternatives.length > 0,
      });
    }
    i += bestLen;
  }

  flushUnmatched();

  return {
    transcript: (transcript || "").trim(),
    lines,
    unmatched: unmatchedParts.filter((p) => p.trim() !== ""),
    tableHint: meta.tableHint,
    paymentHint: meta.paymentHint,
    customerName: meta.customerName,
  };
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}
