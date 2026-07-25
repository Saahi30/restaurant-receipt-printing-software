import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/data';

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json({ bills: data.bills || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newBill = await request.json();
    
    // Read existing data
    const data = await readData();
    
    // Add bill with timestamp and ID if not present
    const billToSave = {
      ...newBill,
      id: newBill.id || Date.now().toString(),
      timestamp: newBill.timestamp || new Date().toISOString()
    };
    
    if (!data.bills) {
      data.bills = [];
    }
    
    data.bills.push(billToSave);
    
    // Save back to file
    await writeData(data);
    
    return NextResponse.json({ success: true, bill: billToSave });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const update = await request.json();
    
    // Read existing data
    const data = await readData();
    
    if (!data.bills) {
      return NextResponse.json({ error: "No bills found" }, { status: 404 });
    }
    
    // Find and update the bill
    const index = data.bills.findIndex((b: any) => b.orderNumber === update.orderNumber);
    if (index === -1) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }
    
    // Merge update
    data.bills[index] = { ...data.bills[index], ...update };
    
    // Save back to file
    await writeData(data);
    
    return NextResponse.json({ success: true, bill: data.bills[index] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
