import { SerialPort } from "serialport";

const ports = await SerialPort.list();

if (ports.length === 0) {
  console.log("No serial/COM ports found.");
  console.log("Plug in the printer via USB and make sure its driver is installed,");
  console.log("or pair it over Bluetooth so Windows creates an outgoing COM port.");
  process.exit(0);
}

console.log("Available serial ports:\n");
for (const p of ports) {
  const bits = [
    `path=${p.path}`,
    p.manufacturer ? `manufacturer=${p.manufacturer}` : null,
    p.friendlyName ? `name=${p.friendlyName}` : null,
    p.vendorId ? `vid=${p.vendorId}` : null,
    p.productId ? `pid=${p.productId}` : null,
  ].filter(Boolean);
  console.log("  " + bits.join("  |  "));
}
console.log("\nSet SERIAL_PATH in your .env to the printer's path (e.g. COM3).");
