/** Browser-print a thermal receipt without yards of blank paper. */

function pxToMm(px: number) {
  return (px * 25.4) / 96;
}

/**
 * Measures #thermal-print-section and sets @page height to content + small pad,
 * then opens the browser print dialog.
 */
export function printThermalSection(
  sectionId = "thermal-print-section",
  opts?: { multiPage?: boolean }
) {
  if (typeof window === "undefined") return;

  const section = document.getElementById(sectionId);
  const STYLE_ID = "thermal-print-page-size";

  const cleanup = () => {
    document.getElementById(STYLE_ID)?.remove();
    window.removeEventListener("afterprint", cleanup);
  };

  let heightMm = 120;

  if (section && !opts?.multiPage) {
    // Temporarily reveal off-screen so we can measure (hidden elements report 0 height)
    const prevClass = section.className;
    const prevStyle = section.getAttribute("style") || "";
    section.classList.remove("hidden");
    section.style.cssText =
      "display:block!important;position:absolute;left:-10000px;top:0;width:80mm;visibility:hidden;height:auto;";

    const heightPx = Math.ceil(Math.max(section.scrollHeight, section.offsetHeight, 1));
    // +10mm pad for cutter / driver margins — keep tight to avoid blank roll
    heightMm = Math.max(50, Math.ceil(pxToMm(heightPx) + 10));

    section.className = prevClass;
    if (prevStyle) section.setAttribute("style", prevStyle);
    else section.removeAttribute("style");
  }

  document.getElementById(STYLE_ID)?.remove();
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = opts?.multiPage
    ? `
    @media print {
      @page {
        size: 80mm auto !important;
        margin: 0 !important;
      }
    }
  `
    : `
    @media print {
      @page {
        size: 80mm ${heightMm}mm !important;
        margin: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);

  window.addEventListener("afterprint", cleanup);
  // Fallback cleanup if afterprint doesn't fire (some browsers)
  setTimeout(cleanup, 60_000);

  window.print();
}
