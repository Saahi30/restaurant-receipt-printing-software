# Browser Print Station (hardened kiosk)

This is the **quick, zero-extra-software** way to run the laptop print station:
just Chrome/Edge on the laptop, opened to your app's laptop page. The app already
prints **silently over USB** using the Web Serial API — there is **no Windows print
dialog** and nothing to click. The code also now:

- **Auto-connects** to the last-approved printer on load and **auto-reconnects** every
  few seconds if the printer/USB drops (`LaptopBoard.tsx`).
- Requests a **screen Wake Lock** so the tab keeps the laptop awake.
- Recovers a **stale serial handle** on write errors and drains any pending jobs.

> Prefer the fully headless `../print-agent` for true unattended 24/7 (no browser at all).
> You can run both during the transition — print jobs are claimed atomically, so each
> bill prints exactly once.

## One-time setup

1. Install **Chrome** (or Edge) on the laptop.
2. Plug the printer in via **USB**.
3. Open the laptop page once, click **Detect Printer**, and pick the printer's COM port.
   This grants permission; after that the page reconnects on its own with no prompt.
4. Edit `start-kiosk.bat` and set `STATION_URL` to your deployed laptop page URL.

## Auto-start on boot

1. Press `Win + R`, type `shell:startup`, Enter.
2. Put a shortcut to `start-kiosk.bat` in that folder.

On boot it disables Windows sleep timers, opens the station full-screen (kiosk), and the
page auto-connects to the printer. Exit kiosk with `Alt + F4`.

## Keep the laptop awake (also set manually)

`start-kiosk.bat` runs these for you, but you can run them once in an Admin terminal too:
```
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
```
Also set **Windows Settings → System → Power → Screen and sleep** to *Never* (on AC),
and disable **USB selective suspend** (Power Options → Advanced → USB settings) so the
printer never powers down.

## Notes

- Web Serial requires **Chrome or Edge** (not Firefox) and the printer must appear as a
  **COM port** (USB cable, or a Bluetooth-paired "outgoing COM port"). If your printer is
  installed only as a Windows *printer driver*, it will use the old print dialog instead —
  connect it as a COM port to get silent printing.
