# Restaurant Print Agent (headless, no browser)

A tiny background program for the **Windows laptop connected to the thermal printer**.
It watches your deployed app's print queue and prints every bill **silently over USB** —
no browser open, no print dialog, no "press Print". It auto-starts on boot and
auto-reconnects if the printer drops.

Phones → your deployed app (Vercel + Supabase) → this agent on the laptop → printer.

## How it works

It reuses your app's existing APIs, so there is **no duplicated business logic**:

1. Polls `GET /api/print-jobs` for pending jobs.
2. Claims each job atomically (`PUT /api/print-jobs` `action:"claim"`) — safe to run
   alongside the browser station; only one consumer wins each job.
3. For takeaway (`PARCEL`) jobs, allocates a token via `POST /api/tokens`.
4. Generates ESC/POS bytes via `POST /api/escpos` and sends them to the printer — either
   to a Windows printer queue (RAW spooler) or directly to a COM port (see `PRINT_MODE`).
5. Records the sale (`POST /api/bills`) and clears the table (`PUT /api/table-sessions`).
6. Marks the job `complete` (or `fail` on error, so it can be retried from Admin).
7. Heartbeats `PUT /api/print-station` so Admin shows the station as online.

## Two ways to reach the printer (`PRINT_MODE`)

- **`raw` (default, recommended for this setup)** — sends bytes to a **Windows printer
  queue** using the RAW spooler. Use this when the printer is installed as a normal
  Windows printer/driver (e.g. `POS80 Printer` on `USB001`). No COM port needed.
- **`serial`** — writes directly to a **COM port**. Only works if the printer actually
  exposes one (a USB-serial printer, or a Bluetooth "outgoing COM port").

> How to tell which you have: run `Get-Printer` in PowerShell. If your thermal printer is
> listed there (e.g. `POS80 Printer`), use **raw** with `WINDOWS_PRINTER_NAME` set to that
> exact name. If instead it appears under Device Manager → *Ports (COM & LPT)*, use
> **serial**.

## One-time setup (raw mode — matches a driver-installed POS80)

1. Install [Node.js LTS](https://nodejs.org) on the laptop.
2. Find the exact printer name:
   ```
   Get-Printer | Select-Object Name, PortName
   ```
   (e.g. `POS80 Printer` on `USB001`.)
3. Copy `.env.example` to `.env` and set:
   - `APP_BASE_URL` — your deployed app URL (same one the phones use).
   - `PRINT_MODE=raw`
   - `WINDOWS_PRINTER_NAME=POS80 Printer` (your exact name)
4. Install & test:
   ```
   npm install
   npm start
   ```
   Generate a bill from a phone — it should print with zero clicks, no dialog.

### Serial mode instead (only if the printer is a COM port)
Set `PRINT_MODE=serial`, then find the port with `npm run list-ports` and set
`SERIAL_PATH` (or leave blank to auto-detect). `serialport` installs on demand.

## Run it 24/7 (pick one)

### Option A — Windows Service (recommended, fully unattended)
Runs on boot even before login, and auto-restarts on crash.

1. Download `nssm.exe` from <https://nssm.cc/download> and drop it in this folder.
2. Right-click `install-service.bat` → **Run as administrator**.

Logs go to `agent.log`. Remove later with:
```
nssm remove RestaurantPrintAgent confirm
```

### Option B — Startup folder (simplest)
1. Press `Win + R`, type `shell:startup`, Enter.
2. Put a shortcut to `start.bat` in that folder.

`start.bat` installs dependencies on first run and auto-restarts the agent if it exits.

## Keep the laptop awake

So Windows never sleeps the printer/network, run once in an Admin terminal:
```
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /change disk-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
```

## Troubleshooting

- **Nothing prints** — check `agent.log` / the console. Verify `APP_BASE_URL` opens in a
  browser and that `npm run list-ports` shows the printer.
- **Blank paper spews** — wrong baud or wrong COM port. Confirm `BAUD_RATE` (default 9600)
  and `SERIAL_PATH`. The agent sends an ESC @ reset on connect.
- **Jobs stuck "printing"** — open Admin → Print Queue → Retry. A failed print is marked
  `failed` automatically so it can be retried.
- **Both browser station and agent running** — fine. Claims are atomic; each bill prints
  once. You can retire the browser station once the agent is stable.
