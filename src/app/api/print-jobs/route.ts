import { NextResponse } from "next/server";
import {
  cancelPrintJob,
  claimPrintJob,
  completePrintJob,
  enqueuePrintJob,
  getPrintStation,
  listPendingPrintJobs,
  listPrintJobs,
  retryPrintJob,
} from "@/lib/table-sessions";

/** Laptop: pending only. Admin: ?all=1 for full queue + station. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("all") === "1") {
      const [jobs, station] = await Promise.all([listPrintJobs(80), getPrintStation()]);
      return NextResponse.json({ jobs, station });
    }
    const jobs = await listPendingPrintJobs();
    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Enqueue an already-finalized "print-only" job (bill/token already saved by the sender). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tableId = body.tableId as string;
    const receipt = body.receipt;
    if (!tableId || !receipt) {
      return NextResponse.json({ error: "tableId and receipt are required" }, { status: 400 });
    }
    const id = await enqueuePrintJob({
      tableId,
      receipt: { ...receipt, _printOnly: true },
    });
    return NextResponse.json({ ok: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Claim / complete / cancel / retry a print job. */
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

    if (body.action === "cancel") {
      const ok = await cancelPrintJob(id);
      return NextResponse.json({ ok, cancelled: ok });
    }

    if (body.action === "retry") {
      const newId = await retryPrintJob(id);
      if (!newId) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, id: newId });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
