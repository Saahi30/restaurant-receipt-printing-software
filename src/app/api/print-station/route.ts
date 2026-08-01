import { NextResponse } from "next/server";
import { getPrintStation, heartbeatPrintStation } from "@/lib/table-sessions";

export async function GET() {
  try {
    const station = await getPrintStation();
    return NextResponse.json({ station });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const station = await heartbeatPrintStation({
      online: body.online !== false,
      printerConnected: !!body.printerConnected,
    });
    return NextResponse.json({ station });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
