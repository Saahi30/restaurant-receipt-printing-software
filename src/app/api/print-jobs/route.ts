import { NextResponse } from "next/server";
import {
  claimPrintJob,
  completePrintJob,
  listPendingPrintJobs,
} from "@/lib/table-sessions";

/** Laptop fetches any jobs that arrived while offline / before Realtime connected. */
export async function GET() {
  try {
    const jobs = await listPendingPrintJobs();
    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Claim or complete a print job. */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = body.id as string;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (body.action === "claim") {
      const job = await claimPrintJob(id);
      if (!job) {
        return NextResponse.json({ claimed: false, job: null });
      }
      return NextResponse.json({ claimed: true, job });
    }

    if (body.action === "complete") {
      await completePrintJob(id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "fail") {
      await completePrintJob(id, body.error || "Print failed");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
