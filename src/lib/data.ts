import { getSupabase } from "@/lib/supabase";

const DEFAULT_DRAWER = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0 };
const DEFAULT_USERS = [{ id: "1", username: "admin", password: "123", role: "admin" }];

export type AppData = {
  settings: any | null;
  tables: any[];
  categories: any[];
  menuItems: any[];
  users: any[];
  bills: any[];
  drawer: Record<string, number>;
  expenses: any[];
};

function billFromRow(row: any) {
  const data = row.data || {};
  return {
    ...data,
    id: row.id,
    orderNumber: row.order_number ?? data.orderNumber,
    tableNumber: row.table_number ?? data.tableNumber,
    orderType: row.order_type ?? data.orderType,
    paymentMethod: row.payment_method ?? data.paymentMethod,
    customerName: row.customer_name ?? data.customerName,
    subtotal: Number(row.subtotal ?? data.subtotal ?? 0),
    taxAmount: Number(row.tax_amount ?? data.taxAmount ?? 0),
    serviceCharge: Number(row.service_charge ?? data.serviceCharge ?? 0),
    discountAmount: Number(row.discount_amount ?? data.discountAmount ?? 0),
    totalAmount: Number(row.total_amount ?? data.totalAmount ?? 0),
    timestamp: row.bill_timestamp ?? data.timestamp,
  };
}

function billToRow(bill: any) {
  return {
    id: String(bill.id),
    order_number: bill.orderNumber,
    table_number: bill.tableNumber ?? null,
    order_type: bill.orderType ?? null,
    payment_method: bill.paymentMethod ?? null,
    customer_name: bill.customerName ?? null,
    subtotal: bill.subtotal ?? 0,
    tax_amount: bill.taxAmount ?? 0,
    service_charge: bill.serviceCharge ?? 0,
    discount_amount: bill.discountAmount ?? 0,
    total_amount: bill.totalAmount ?? 0,
    bill_timestamp: bill.timestamp ?? new Date().toISOString(),
    data: bill,
  };
}

async function replaceById(table: string, rows: Record<string, any>[]) {
  const supabase = getSupabase();
  const { error: delError } = await supabase.from(table).delete().neq("id", "__never__");
  if (delError) throw delError;
  if (rows.length === 0) return;
  const { error: insError } = await supabase.from(table).insert(rows);
  if (insError) throw insError;
}

export async function readData(): Promise<AppData> {
  const supabase = getSupabase();

  const [
    settingsRes,
    tablesRes,
    categoriesRes,
    menuRes,
    usersRes,
    billsRes,
    drawerRes,
    expensesRes,
  ] = await Promise.all([
    supabase.from("settings").select("data").eq("id", 1).maybeSingle(),
    supabase.from("tables").select("id, name").order("created_at", { ascending: true }),
    supabase.from("categories").select("id, name, name_hi").order("created_at", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id, category_id, name, name_hi, price, is_favorite")
      .order("created_at", { ascending: true }),
    supabase.from("app_users").select("id, username, password, role, avatar").order("created_at", { ascending: true }),
    supabase.from("bills").select("*").order("bill_timestamp", { ascending: false }),
    supabase.from("drawer").select("denominations").eq("id", 1).maybeSingle(),
    supabase
      .from("expenses")
      .select("id, description, amount, expense_timestamp")
      .order("expense_timestamp", { ascending: false }),
  ]);

  const errors = [
    settingsRes.error,
    tablesRes.error,
    categoriesRes.error,
    menuRes.error,
    usersRes.error,
    billsRes.error,
    drawerRes.error,
    expensesRes.error,
  ].filter(Boolean);

  if (errors.length) {
    throw new Error(errors.map((e) => e!.message).join("; "));
  }

  const users =
    usersRes.data && usersRes.data.length > 0
      ? usersRes.data.map((u) => ({
          id: u.id,
          username: u.username,
          password: u.password ?? "",
          role: u.role,
          avatar: u.avatar ?? "",
        }))
      : DEFAULT_USERS;

  return {
    settings: settingsRes.data?.data ?? null,
    tables: (tablesRes.data || []).map((t) => ({ id: t.id, name: t.name })),
    categories: (categoriesRes.data || []).map((c) => ({
      id: c.id,
      name: c.name,
      nameHi: c.name_hi || "",
    })),
    menuItems: (menuRes.data || []).map((m) => ({
      id: m.id,
      categoryId: m.category_id,
      name: m.name,
      nameHi: m.name_hi || "",
      price: Number(m.price),
      isFavorite: !!m.is_favorite,
    })),
    users,
    bills: (billsRes.data || []).map(billFromRow),
    drawer: { ...DEFAULT_DRAWER, ...(drawerRes.data?.denominations || {}) },
    expenses: (expensesRes.data || []).map((e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      timestamp: e.expense_timestamp,
    })),
  };
}

export async function writeData(data: AppData) {
  const supabase = getSupabase();

  const { error: settingsError } = await supabase.from("settings").upsert({
    id: 1,
    data: data.settings ?? {},
    updated_at: new Date().toISOString(),
  });
  if (settingsError) throw settingsError;

  const { error: drawerError } = await supabase.from("drawer").upsert({
    id: 1,
    denominations: data.drawer ?? DEFAULT_DRAWER,
    updated_at: new Date().toISOString(),
  });
  if (drawerError) throw drawerError;

  // Clear dependents before parents
  const { error: clearMenu } = await supabase.from("menu_items").delete().neq("id", "__never__");
  if (clearMenu) throw clearMenu;

  await replaceById(
    "categories",
    (data.categories || []).map((c) => ({
      id: String(c.id),
      name: c.name,
      name_hi: c.nameHi || null,
    }))
  );

  const menuRows = (data.menuItems || []).map((m) => ({
    id: String(m.id),
    category_id: m.categoryId ?? null,
    name: m.name,
    name_hi: m.nameHi || null,
    price: m.price ?? 0,
    is_favorite: !!m.isFavorite,
  }));
  if (menuRows.length > 0) {
    const { error: menuError } = await supabase.from("menu_items").insert(menuRows);
    if (menuError) throw menuError;
  }

  await replaceById(
    "tables",
    (data.tables || []).map((t) => ({
      id: String(t.id),
      name: t.name,
    }))
  );

  await replaceById(
    "app_users",
    (data.users || DEFAULT_USERS).map((u) => ({
      id: String(u.id),
      username: u.username,
      password: u.password ?? "",
      role: u.role ?? "waiter",
      avatar: u.avatar || null,
    }))
  );

  await replaceById(
    "expenses",
    (data.expenses || []).map((e) => ({
      id: String(e.id),
      description: e.description ?? "",
      amount: e.amount ?? 0,
      expense_timestamp: e.timestamp ?? new Date().toISOString(),
    }))
  );

  const bills = data.bills || [];
  if (bills.length > 0) {
    const { error: billsError } = await supabase.from("bills").upsert(bills.map(billToRow), {
      onConflict: "id",
    });
    if (billsError) throw billsError;
  }
}

export async function insertBill(bill: any) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("bills").insert(billToRow(bill)).select("*").single();
  if (error) throw error;
  return billFromRow(data);
}

export async function updateBillByOrderNumber(orderNumber: string, update: any) {
  const supabase = getSupabase();
  const { data: existing, error: findError } = await supabase
    .from("bills")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (findError) throw findError;
  if (!existing) return null;

  const merged = { ...billFromRow(existing), ...update, orderNumber };
  const { data, error } = await supabase
    .from("bills")
    .update(billToRow(merged))
    .eq("order_number", orderNumber)
    .select("*")
    .single();

  if (error) throw error;
  return billFromRow(data);
}

export async function getBills() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .order("bill_timestamp", { ascending: false });
  if (error) throw error;
  return (data || []).map(billFromRow);
}
