import { NextResponse } from "next/server";
import { readData, writeData } from "@/lib/data";

export const DEFAULT_SETTINGS = {
  restaurantName: "MAHANKAL FOOD PARK",
  tagline: "Family Restaurant & Party Venue",
  address: "Mahankal Road, Kathmandu",
  phone: "+977 98XXXXXXXX",
  gstNumber: "",
  currency: "Rs.",
  taxRate: "13.00",
  serviceChargeRate: "0.00",
  aboutUs:
    "ABOUT US\nMahankal Food Park is a family restaurant serving fresh Nepali, Indian & Chinese cuisine.\nWe also host parties, catering & events.\n\nOpen Daily: 10:00 AM - 11:00 PM\nContact: +977 98XXXXXXXX\nFacebook: /mahankalfoodpark",
  footerText: "Thank you for visiting! Please come again.",
  wifiSSID: "",
  wifiPassword: "",
  defaultPaperSize: "80mm",
  upiId: "",
  receiptHeaderNote: "TAX INVOICE / BILL",
  autoPrintOnCheckout: true,
  escPosCut: true,
  escPosDrawer: false,
  item1Name: "Item 1",
  item1Price: "100.00",
  item2Name: "Item 2",
  item2Price: "150.00",
  item3Name: "Item 3",
  item3Price: "200.00",
  item4Name: "Item 4",
  item4Price: "250.00",
};

export async function GET() {
  try {
    const data = await readData();
    if (!data.settings) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }
    return NextResponse.json(data.settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const data = await readData();
    
    const newSettings = { ...DEFAULT_SETTINGS, ...data.settings, ...body };
    data.settings = newSettings;
    
    await writeData(data);
    
    return NextResponse.json(newSettings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
