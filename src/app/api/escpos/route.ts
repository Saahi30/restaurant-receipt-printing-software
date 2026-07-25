import { NextResponse } from "next/server";
import { generateEscPosReceipt, generateEscPosKOT, ReceiptData } from "@/lib/escpos";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type = "receipt", data } = body;

    if (!data) {
      return NextResponse.json({ error: "Missing receipt data" }, { status: 400 });
    }

    let result: { uint8Array: Uint8Array; hex: string };
    if (type === "kot") {
      result = generateEscPosKOT(data);
    } else {
      result = generateEscPosReceipt(data as ReceiptData);
    }

    // Convert uint8Array to standard number array for JSON transport
    const byteArray = Array.from(result.uint8Array);

    return NextResponse.json({
      success: true,
      hex: result.hex,
      bytes: byteArray,
      sizeInBytes: byteArray.length,
    });
  } catch (error) {
    console.error("Error generating ESC/POS commands:", error);
    return NextResponse.json({ error: "Failed to generate ESC/POS commands" }, { status: 500 });
  }
}
