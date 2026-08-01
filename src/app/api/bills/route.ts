import { NextResponse } from "next/server";
import { getBills, insertBill, updateBillByOrderNumber } from "@/lib/data";

export async function GET() {
  try {
    const bills = await getBills();
    return NextResponse.json({ bills });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newBill = await request.json();

    const billToSave = {
      ...newBill,
      id: newBill.id || Date.now().toString(),
      timestamp: newBill.timestamp || new Date().toISOString(),
    };

    const bill = await insertBill(billToSave);
    return NextResponse.json({ success: true, bill });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const update = await request.json();

    if (!update.orderNumber) {
      return NextResponse.json({ error: "orderNumber is required" }, { status: 400 });
    }

    const bill = await updateBillByOrderNumber(update.orderNumber, update);
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, bill });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
