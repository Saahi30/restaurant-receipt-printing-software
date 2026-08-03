import "dotenv/config";
import { spawn } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

/* ------------------------------------------------------------------ */
/* Config                                                             */
/* ------------------------------------------------------------------ */

const APP_BASE_URL = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
// "raw"  = send to a Windows printer queue (RAW spooler) — for driver-installed USB printers.
// "serial" = write to a COM port directly (Web-Serial-style).
const PRINT_MODE = (process.env.PRINT_MODE || "raw").trim().toLowerCase();
const WINDOWS_PRINTER_NAME = process.env.WINDOWS_PRINTER_NAME?.trim() || "";
const SERIAL_PATH = process.env.SERIAL_PATH?.trim() || "";
const BAUD_RATE = parseInt(process.env.BAUD_RATE || "9600", 10);
const POLL_MS = parseInt(process.env.POLL_MS || "1500", 10);
const HEARTBEAT_MS = parseInt(process.env.HEARTBEAT_MS || "6000", 10);
const PAPER_WIDTH = process.env.PAPER_WIDTH === "58mm" ? "58mm" : "80mm";
const PRINT_AGENT_KEY = process.env.PRINT_AGENT_KEY?.trim() || "";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!APP_BASE_URL) {
  console.error("[FATAL] APP_BASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
if (PRINT_MODE === "raw" && !WINDOWS_PRINTER_NAME) {
  console.error('[FATAL] PRINT_MODE=raw needs WINDOWS_PRINTER_NAME (e.g. "POS80 Printer").');
  process.exit(1);
}

const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);
const warn = (...a) => console.warn(new Date().toLocaleTimeString(), "WARN", ...a);
const errlog = (...a) => console.error(new Date().toLocaleTimeString(), "ERROR", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* HTTP helpers (talk to the deployed app's existing APIs)            */
/* ------------------------------------------------------------------ */

function apiHeaders() {
  const h = { "Content-Type": "application/json" };
  if (PRINT_AGENT_KEY) h["x-print-agent-key"] = PRINT_AGENT_KEY;
  return h;
}

async function api(path, method = "GET", body) {
  const res = await fetch(`${APP_BASE_URL}${path}`, {
    method,
    headers: apiHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON response from ${path}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status} on ${path}`);
  }
  return json;
}

/** POST receipt data to the app's ESC/POS generator and get printable bytes. */
async function fetchEscposBytes(type, data) {
  const json = await api("/api/escpos", "POST", { type, data });
  if (!json.success || !json.bytes) throw new Error(json.error || "ESC/POS generation failed");
  return json.bytes; // number[]
}

/* ------------------------------------------------------------------ */
/* Raw spooler printer (Windows print queue, RAW datatype)           */
/* ------------------------------------------------------------------ */

class RawPrinter {
  get connected() {
    return true; // the spooler queue is always available
  }

  async ensureConnected() {
    return true;
  }

  async write(bytes) {
    const tmp = join(tmpdir(), `receipt-${randomUUID()}.bin`);
    await writeFile(tmp, Buffer.from(bytes));
    try {
      await new Promise((resolve, reject) => {
        const ps = spawn(
          "powershell.exe",
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            join(__dirname, "raw-print.ps1"),
            "-PrinterName",
            WINDOWS_PRINTER_NAME,
            "-FilePath",
            tmp,
          ],
          { windowsHide: true }
        );
        let stderr = "";
        ps.stderr.on("data", (d) => (stderr += d.toString()));
        ps.on("error", reject);
        ps.on("close", (code) =>
          code === 0 ? resolve() : reject(new Error(stderr.trim() || `raw-print exit ${code}`))
        );
      });
    } finally {
      unlink(tmp).catch(() => {});
    }
  }

  async reset() {
    try {
      await this.write([0x1b, 0x40]); // ESC @
    } catch {
      /* ignore */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Serial printer manager (auto-connect + auto-reconnect)            */
/* ------------------------------------------------------------------ */

class SerialPrinter {
  constructor() {
    this.port = null;
    this.opening = false;
    this.SerialPort = null;
  }

  get connected() {
    return !!(this.port && this.port.isOpen);
  }

  async loadLib() {
    if (this.SerialPort) return;
    ({ SerialPort: this.SerialPort } = await import("serialport"));
  }

  async resolvePath() {
    if (SERIAL_PATH) return SERIAL_PATH;
    const ports = await this.SerialPort.list();
    if (ports.length === 0) return null;
    const preferred = ports.find((p) =>
      /printer|pos|thermal|usb/i.test(`${p.manufacturer || ""} ${p.friendlyName || ""}`)
    );
    return (preferred || ports[0]).path;
  }

  async ensureConnected() {
    if (this.connected || this.opening) return this.connected;
    this.opening = true;
    try {
      await this.loadLib();
      const path = await this.resolvePath();
      if (!path) return false;
      await new Promise((resolve, reject) => {
        const p = new this.SerialPort({ path, baudRate: BAUD_RATE, autoOpen: false });
        p.open((err) => {
          if (err) return reject(err);
          this.port = p;
          resolve();
        });
      });
      this.port.on("close", () => {
        warn("Printer port closed.");
        this.port = null;
      });
      this.port.on("error", (e) => warn("Printer port error:", e.message));
      log(`Printer connected on ${path} @ ${BAUD_RATE} baud.`);
      return true;
    } catch (e) {
      this.port = null;
      warn("Could not open printer port:", e.message);
      return false;
    } finally {
      this.opening = false;
    }
  }

  async write(bytes) {
    if (!this.connected) {
      const ok = await this.ensureConnected();
      if (!ok) throw new Error("Printer not connected");
    }
    await new Promise((resolve, reject) => {
      this.port.write(Buffer.from(bytes), (err) => {
        if (err) return reject(err);
        this.port.drain((derr) => (derr ? reject(derr) : resolve()));
      });
    });
  }

  async reset() {
    try {
      if (this.connected) await this.write([0x1b, 0x40]);
    } catch {
      /* ignore */
    }
  }
}

const printer = PRINT_MODE === "serial" ? new SerialPrinter() : new RawPrinter();

/* ------------------------------------------------------------------ */
/* Business logic (mirrors LaptopBoard.tsx runPrintJob)              */
/* ------------------------------------------------------------------ */

/** Allocate a takeaway token for PARCEL jobs and build bill + token slip. */
async function withTakeawayToken(tableId, data) {
  if (tableId !== "PARCEL") return { bill: data, tokenSlip: null };

  if (data.tokenNumber) {
    return { bill: data, tokenSlip: { ...data, isTokenSlip: true, receiptHeaderNote: "" } };
  }

  const collected =
    data.paymentCollected !== false && (data.paymentMethod || "").toLowerCase() !== "udhaar";

  const { token } = await api("/api/tokens", "POST", {
    orderNumber: data.orderNumber,
    customerName: data.customerName,
    paymentMethod: data.paymentMethod,
    paymentCollected: collected,
    items: (data.items || []).map((l) => ({
      name: l.name,
      nameHi: l.nameHi,
      quantity: l.quantity,
      price: l.price,
    })),
    totalAmount: data.totalAmount,
    currency: data.currency,
    createdBy: "print-agent",
  });

  const bill = {
    ...data,
    tokenNumber: token.tokenLabel,
    tableNumber: token.tokenLabel,
    paymentCollected: collected,
    receiptHeaderNote: "KITCHEN / PACK COPY",
  };
  return { bill, tokenSlip: { ...bill, isTokenSlip: true, receiptHeaderNote: "" } };
}

/** Print token slip (if any) then the receipt — silently over serial. */
async function printReceipt(data, tokenSlip) {
  if (tokenSlip?.tokenNumber) {
    const tokenBytes = await fetchEscposBytes("token", {
      restaurantName: tokenSlip.restaurantName,
      tokenNumber: tokenSlip.tokenNumber,
      orderNumber: tokenSlip.orderNumber,
      date: tokenSlip.date,
      totalAmount: tokenSlip.totalAmount,
      currency: tokenSlip.currency,
      paymentCollected: tokenSlip.paymentCollected,
      customerName: tokenSlip.customerName,
      paperWidth: tokenSlip.paperWidth || PAPER_WIDTH,
    });
    await printer.write(tokenBytes);
    // Let the cutter finish before the next slip.
    await sleep(1200);
  }

  const escposData = {
    ...data,
    paperWidth: data.paperWidth || PAPER_WIDTH,
    items: (data.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      notes: item.notes,
    })),
  };
  const receiptBytes = await fetchEscposBytes("receipt", escposData);
  await printer.write(receiptBytes);
}

/** Record the bill and clear the table session (mirrors finishAndClear). */
async function finishAndClear(tableId, data) {
  await api("/api/bills", "POST", data).catch((e) => warn("Bill record failed:", e.message));
  await api("/api/table-sessions", "PUT", {
    tableId,
    clear: true,
    items: [],
    updatedBy: "print-agent",
  }).catch((e) => warn("Session clear failed:", e.message));
}

/** Build a small self-contained "TEST OK" ESC/POS receipt (no server needed). */
function buildTestBytes() {
  const enc = (s) => Array.from(Buffer.from(String(s), "latin1"));
  const b = [];
  b.push(0x1b, 0x40); // init
  b.push(0x1b, 0x61, 0x01); // center
  b.push(0x1b, 0x45, 0x01); // bold on
  b.push(0x1d, 0x21, 0x11); // double width/height
  b.push(...enc("TEST OK"), 0x0a);
  b.push(0x1d, 0x21, 0x00); // normal size
  b.push(...enc("Print agent is ready"), 0x0a);
  b.push(0x1b, 0x45, 0x00); // bold off
  b.push(...enc(new Date().toLocaleString()), 0x0a);
  b.push(...enc(PRINT_MODE === "serial" ? SERIAL_PATH || "auto COM" : WINDOWS_PRINTER_NAME), 0x0a);
  b.push(0x1b, 0x64, 0x03); // feed 3 lines
  b.push(0x1d, 0x56, 0x01); // partial cut
  return b;
}

async function testPrint() {
  log("Printing startup TEST OK receipt...");
  const ok = await printer.ensureConnected();
  if (!ok) {
    warn("Test print skipped — printer not reachable yet.");
    return;
  }
  try {
    await printer.write(buildTestBytes());
    log("TEST OK receipt sent.");
  } catch (e) {
    warn("Test print failed:", e.message);
  }
}

const handled = new Set();

async function processJob(job) {
  if (handled.has(job.id)) return;
  handled.add(job.id);

  // Atomic claim — if the browser station also runs, only one wins.
  const claim = await api("/api/print-jobs", "PUT", { id: job.id, action: "claim" });
  if (!claim.claimed) {
    return; // someone else got it
  }

  log(`Printing job ${job.id} (table ${job.table_id})...`);
  try {
    const data = job.receipt;
    if (!data?.items?.length) throw new Error("Empty receipt on print job");

    const prepared = await withTakeawayToken(job.table_id, data);
    await printReceipt(prepared.bill, prepared.tokenSlip);
    // Phone-sent jobs are already finalized (bill saved + table cleared) — just print.
    if (!data._printOnly) {
      await finishAndClear(job.table_id, prepared.bill);
    }
    await api("/api/print-jobs", "PUT", { id: job.id, action: "complete" });
    log(`Job ${job.id} printed & completed.`);
  } catch (e) {
    const msg = e.message || "Print failed";
    errlog(`Job ${job.id} failed:`, msg);
    handled.delete(job.id); // allow a future retry
    await api("/api/print-jobs", "PUT", { id: job.id, action: "fail", error: msg }).catch(() => {});
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Loops                                                              */
/* ------------------------------------------------------------------ */

let draining = false;
async function pollOnce() {
  if (draining) return;
  draining = true;
  try {
    const ok = await printer.ensureConnected();
    if (!ok) return; // no printer yet; try again next tick

    const { jobs } = await api("/api/print-jobs", "GET");
    for (const job of jobs || []) {
      if (!printer.connected) break;
      try {
        await processJob(job);
      } catch {
        // logged in processJob; stop this pass so we don't hammer a dead printer
        break;
      }
    }
  } catch (e) {
    warn("Poll error:", e.message);
  } finally {
    draining = false;
  }
}

async function heartbeat() {
  try {
    await api("/api/print-station", "PUT", {
      online: true,
      printerConnected: printer.connected,
    });
  } catch (e) {
    warn("Heartbeat failed:", e.message);
  }
}

async function main() {
  log("Restaurant print agent starting...");
  log(`App:      ${APP_BASE_URL}`);
  log(`Mode:     ${PRINT_MODE}`);
  if (PRINT_MODE === "serial") {
    log(`Printer:  ${SERIAL_PATH || "(auto-detect)"} @ ${BAUD_RATE} baud`);
  } else {
    log(`Printer:  Windows queue "${WINDOWS_PRINTER_NAME}" (RAW)`);
  }
  log(`Poll:     every ${POLL_MS}ms`);

  await printer.ensureConnected();

  if ((process.env.TEST_PRINT_ON_START || "true").toLowerCase() !== "false") {
    await testPrint();
  }

  await heartbeat();

  setInterval(pollOnce, POLL_MS);
  setInterval(heartbeat, HEARTBEAT_MS);
}

async function shutdown() {
  log("Shutting down — marking station offline...");
  try {
    await api("/api/print-station", "PUT", { online: false, printerConnected: false });
  } catch {
    /* ignore */
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("uncaughtException", (e) => errlog("uncaughtException:", e.message));
process.on("unhandledRejection", (e) => errlog("unhandledRejection:", e?.message || e));

main();
