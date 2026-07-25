import { NextResponse } from "next/server";
import { readData, writeData } from "@/lib/data";

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json({
      tables: data.tables || [],
      categories: data.categories || [],
      menuItems: data.menuItems || [],
      users: data.users || [],
      drawer: data.drawer || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0 },
      expenses: data.expenses || [],
    });
  } catch (error) {
    console.error("Error fetching admin data:", error);
    return NextResponse.json({ tables: [], categories: [], menuItems: [], users: [], drawer: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0 }, expenses: [] }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const data = await readData();
    
    // Update the properties that are passed in the body
    if (body.tables !== undefined) data.tables = body.tables;
    if (body.categories !== undefined) data.categories = body.categories;
    if (body.menuItems !== undefined) data.menuItems = body.menuItems;
    if (body.users !== undefined) data.users = body.users;
    if (body.drawer !== undefined) data.drawer = body.drawer;
    if (body.expenses !== undefined) data.expenses = body.expenses;
    
    await writeData(data);
    
    return NextResponse.json({
      tables: data.tables,
      categories: data.categories,
      menuItems: data.menuItems,
      users: data.users,
      drawer: data.drawer,
      expenses: data.expenses,
    });
  } catch (error) {
    console.error("Error updating admin data:", error);
    return NextResponse.json({ error: "Failed to update admin data" }, { status: 500 });
  }
}
