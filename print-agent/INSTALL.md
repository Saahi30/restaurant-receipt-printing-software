# Install the Print Agent on a Laptop (step-by-step)

This sets up the **Windows laptop that stays connected to the thermal printer**. Once
installed, bills sent from phones print here **automatically and silently** — no browser,
no "Print" dialog, nothing to click.

Do this on **one** laptop only — the one the printer is plugged into.

---

## What you need
- A Windows laptop
- The thermal printer (POS80) + its USB cable
- Internet on the laptop
- ~15 minutes

---

## Step 1 — Install Node.js
1. Go to <https://nodejs.org>
2. Download the **LTS** version and install it (click Next through the defaults).

To confirm it worked, open **PowerShell** (Start menu → type "PowerShell") and run:
```powershell
node -v
```
You should see a version number like `v20.x.x`.

---

## Step 2 — Connect the printer and find its name
1. Plug the printer into the laptop by **USB** and turn it on. Install its driver if
   Windows asks (use the POS80 driver disc/download).
2. In PowerShell, run:
   ```powershell
   Get-Printer | Select-Object Name, PortName
   ```
3. Find your thermal printer in the list and **write down its exact `Name`**
   (for example: `POS80 Printer`). You'll need it in Step 4.

---

## Step 3 — Get the agent files onto the laptop
Pick ONE option.

**Option A — with Git (easiest to update later)**
1. Install Git from <https://git-scm.com/download/win> (defaults are fine).
2. In PowerShell:
   ```powershell
   cd $HOME\Downloads
   git clone https://github.com/Saahi30/restaurant-receipt-printing-software.git
   cd restaurant-receipt-printing-software\print-agent
   ```

**Option B — copy by USB stick (no Git)**
1. On a computer that has the project, copy the **`print-agent`** folder to a USB stick.
   (Do NOT copy `node_modules` or `.env` — those are made fresh on each laptop.)
2. Paste it somewhere on the new laptop, e.g. `C:\print-agent`.
3. In PowerShell, go into that folder, e.g.:
   ```powershell
   cd C:\print-agent
   ```

You're in the right folder if `dir` shows `index.mjs` and `package.json`.

---

## Step 4 — Create the settings file (`.env`)
In the `print-agent` folder, make a copy of `.env.example` named `.env`:
```powershell
copy .env.example .env
notepad .env
```
Make sure these lines are set (change the printer name to the one from Step 2):
```
APP_BASE_URL=https://mahankalfoodpark.netlify.app
PRINT_MODE=raw
WINDOWS_PRINTER_NAME=POS80 Printer
```
Save and close Notepad.

---

## Step 5 — Install and test
```powershell
npm install
npm start
```
Leave the window open. Now go to a phone, make a bill, and tap **Print** — a receipt
should come out of this printer within a couple of seconds, with no dialog anywhere.

- To confirm the laptop is registered, open **Admin → Print Queue** in the app; it should
  show the station **Online**.
- Press `Ctrl + C` in the PowerShell window to stop the test.

---

## Step 6 — Make it run automatically 24/7
Pick ONE option.

**Option A — Windows Service (best; runs on boot, restarts itself)**
1. Download `nssm.exe` from <https://nssm.cc/download> and put it in the `print-agent` folder.
2. Right-click **`install-service.bat`** → **Run as administrator**.

It now starts every time the laptop boots. Logs are saved to `agent.log`.
To remove it later: `nssm remove RestaurantPrintAgent confirm`

**Option B — Startup folder (simplest)**
1. Press `Win + R`, type `shell:startup`, press Enter.
2. Put a shortcut to **`start.bat`** into that folder.

`start.bat` also auto-restarts the agent if it ever closes.

---

## Step 7 — Stop the laptop from sleeping
Open PowerShell **as Administrator** and run:
```powershell
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
```
Also: Control Panel → Power Options → Change plan settings → Change advanced power
settings → **USB settings → USB selective suspend → Disabled** (so the printer never
powers down).

---

## Moving the printer to a different laptop later
Set up the new laptop with the steps above, then **turn off the agent on the old one** so
only one is active:
- Service: `nssm remove RestaurantPrintAgent confirm`
- Startup folder: delete the `start.bat` shortcut from `shell:startup`

(Two agents at once won't double-print, but only run it where the printer is.)

---

## If something goes wrong
- **Nothing prints:** make sure the PowerShell window / service is running, and that
  `Get-Printer` shows your printer. Check `agent.log`.
- **"PRINT_MODE=raw needs WINDOWS_PRINTER_NAME":** the printer name in `.env` is empty or
  wrong — set it to the exact name from Step 2.
- **Wrong/garbled or blank paper:** the printer name is right but it may be a different
  model; confirm `WINDOWS_PRINTER_NAME` matches exactly (including spaces).
- **Admin shows station Offline:** the laptop lost internet, or the agent isn't running.
- **Phone still shows a print dialog:** the app update that sends bills to the queue must be
  deployed to the website first. After it's live, fully close and reopen the phone browser tab.
- **`Heartbeat failed` / `Poll error` / `Cannot reach ...` (fetch failed):** the agent cannot
  reach the website over HTTPS. This is not a printer problem. (A `TEST OK` receipt can still
  print — that only proves USB/printer works.)
  1. Open `print-agent\.env` and confirm:
     ```
     APP_BASE_URL=https://mahankalfoodpark.netlify.app
     ```
     (https, no trailing slash — not a vercel.app placeholder).
  2. On the laptop, in PowerShell:
     ```powershell
     curl https://mahankalfoodpark.netlify.app/api/health
     ```
     You should see `{"ok":true}`. If that fails, fix Wi‑Fi / DNS first (try phone hotspot).
  3. If the log shows **`ETIMEDOUT`** / **`AggregateError`**: Node cannot open a TCP
     connection to Netlify. Common on restaurant Wi‑Fi. The agent prefers IPv4 automatically;
     if it still times out:
     - Allow **Node.js JavaScript Runtime** / `node.exe` through Windows Firewall (Private + Public).
     - Temporarily disable antivirus web shield and retry.
     - Switch the laptop to phone hotspot and restart the agent — if hotspot works, the venue
       Wi‑Fi is blocking outbound HTTPS for Node.
  4. Restart the agent (`START-PRINTING.bat` or the NSSM service) and confirm the startup log
     shows `App: https://mahankalfoodpark.netlify.app` and `App reachable: .../api/health`.
