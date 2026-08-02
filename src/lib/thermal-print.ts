/** Browser-print a thermal receipt without yards of blank paper. */

function pxToMm(px: number) {
  return (px * 25.4) / 96;
}

/**
 * Measures #thermal-print-section and sets @page height to content + small pad,
 * then opens the browser print dialog.
 * Resolves when the print dialog closes (afterprint) so callers can chain a second print.
 */
export function printThermalSection(sectionId = "thermal-print-section"): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const section = document.getElementById(sectionId);
  const STYLE_ID = "thermal-print-page-size";

  let heightMm = 120;

  if (section) {
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
  style.textContent = `
    @media print {
      @page {
        size: 80mm ${heightMm}mm !important;
        margin: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      document.getElementById(STYLE_ID)?.remove();
      window.removeEventListener("afterprint", finish);
      resolve();
    };

    window.addEventListener("afterprint", finish);
    // Fallback if afterprint never fires (some mobile browsers)
    setTimeout(finish, 60_000);

    // Let layout settle after React paint before opening the dialog
    requestAnimationFrame(() => {
      window.print();
    });
  });
}
