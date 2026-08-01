import { NextResponse } from "next/server";
import {
  clearSession,
  listSessions,
  markReady,
  upsertSession,
} from "@/lib/table-sessions";

export async function GET() {
  try {
    const sessions = await listSessions();
    return NextResponse.json({ sessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const tableId = body.tableId as string;
    if (!tableId) {
      return NextResponse.json({ error: "tableId is required" }, { status: 400 });
    }

    if (body.clear) {
      const session = await clearSession(tableId, body.updatedBy);
      return NextResponse.json({ session });
    }

    if (body.markReady) {
      if (!body.receipt) {
        return NextResponse.json({ error: "receipt is required" }, { status: 400 });
      }
      const session = await markReady({
        tableId,
        receipt: body.receipt,
        items: body.items || [],
        customerName: body.customerName,
        paymentMethod: body.paymentMethod,
        orderType: body.orderType,
        updatedBy: body.updatedBy,
      });
      return NextResponse.json({ session, sent: true });
    }

    const session = await upsertSession({
      tableId,
      items: body.items || [],
      customerName: body.customerName,
      paymentMethod: body.paymentMethod,
      orderType: body.orderType,
      status: body.status,
      receipt: body.receipt,
      updatedBy: body.updatedBy,
    });
    return NextResponse.json({ session });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
