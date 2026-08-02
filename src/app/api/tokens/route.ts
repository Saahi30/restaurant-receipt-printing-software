import { NextResponse } from "next/server";
import { createToken, listTokens, updateToken, type TokenStatus } from "@/lib/tokens";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "1";
    const tokens = await listTokens({ activeOnly });
    return NextResponse.json({ tokens });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = await createToken({
      orderNumber: body.orderNumber,
      billId: body.billId,
      customerName: body.customerName,
      paymentMethod: body.paymentMethod,
      paymentCollected: body.paymentCollected,
      items: body.items,
      totalAmount: body.totalAmount,
      currency: body.currency,
      slaMinutes: body.slaMinutes,
      createdBy: body.createdBy,
      notes: body.notes,
    });
    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const status = body.status as TokenStatus | undefined;
    if (status && !["preparing", "ready", "handed_over", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const token = await updateToken(body.id, {
      status,
      paymentCollected: body.paymentCollected,
      paymentMethod: body.paymentMethod,
      notes: body.notes,
    });

    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
