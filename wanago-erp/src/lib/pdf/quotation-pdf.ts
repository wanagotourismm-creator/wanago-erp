// Wanago's actual branded quotation/invoice PDF — logo + date header, two
// green "Quotation by / to" info boxes, a dark-green item table with a
// light-green totals panel (watermarked), a Payable-To/bank box next to
// Terms & Conditions, and a dark-green footer bar. Built once as a jsPDF
// document so both the download button and the auto-email flow render
// byte-identical PDFs — see downloadQuotationPdf() / generateQuotationPdfBlob().

import { numberToIndianWords } from "@/lib/utils/number-to-words";

export type QuotationPdfLineItem = { description: string; pax: number | null; price: number; total: number };

export type QuotationPdfInput = {
  refNumber: string;
  date: string; // pre-formatted, e.g. "26/06/2026"
  company: {
    businessName: string;
    addressLine: string; // full address, single string — word-wrapped automatically
    phone?: string;
    gstNumber?: string;
  };
  customer: {
    name: string;
    addressLine?: string;
    phone?: string;
    gstin?: string | null;
  };
  lineItems: QuotationPdfLineItem[];
  subtotal: number;
  grandTotal: number;
  bank: { accountName: string; accountNumber: string; ifsc: string; bankName: string; qrDataUrl?: string | null };
  terms: string[];
  logoDataUrl: string;
  websiteUrl?: string;
  socialHandle?: string;
};

const GREEN_DARK: [number, number, number] = [22, 74, 50];
const GREEN_LIGHT: [number, number, number] = [232, 247, 239];
const TEXT_DARK: [number, number, number] = [20, 20, 20];
const TEXT_MUTED: [number, number, number] = [90, 90, 90];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
// Keep item rows clear of the footer bar (drawn at y=280) on any page.
const MAX_CONTENT_Y = 265;

// Every rupee figure on the PDF is rounded to match formatCurrency()'s
// maximumFractionDigits: 0 used everywhere else in the app — without this,
// float noise from per-pax price * pax math (e.g. 999.99 * 3 =
// 2999.9700000000003) shows up as "₹2,999.97" on the PDF next to "₹3,000"
// in the UI, and a different figure again on the "in words" line.
function formatINR(amount: number): string {
  return Math.round(amount).toLocaleString("en-IN");
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Loads the standard Wanago wordmark as a data URL, ready to pass into
// QuotationPdfInput.logoDataUrl — callers just await this once.
export async function loadWanagoLogoDataUrl(): Promise<string | null> {
  return loadImageAsDataUrl("/images/logo-dark-clean.png");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildQuotationPdfDoc(input: QuotationPdfInput): Promise<any> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Header: logo + date ──────────────────────────────────────
  let y = 20;
  if (input.logoDataUrl) {
    try {
      doc.addImage(input.logoDataUrl, "PNG", MARGIN, 12, 42, 13.3);
    } catch { /* bad image data — skip, rest of the PDF still renders */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`Date: ${input.date}`, PAGE_W - MARGIN, 18, { align: "right" });

  // ── "Quotation by / to" boxes ────────────────────────────────
  y = 34;
  const boxW = (CONTENT_W - 6) / 2;
  const boxH = 44;
  const rightBoxX = MARGIN + boxW + 6;

  doc.setFillColor(...GREEN_LIGHT);
  doc.roundedRect(MARGIN, y, boxW, boxH, 3, 3, "F");
  doc.roundedRect(rightBoxX, y, boxW, boxH, 3, 3, "F");

  function renderInfoBox(x: number, heading: string, name: string, addressLine: string | undefined, phone: string | undefined, gstin: string | undefined) {
    const padX = x + 6;
    let ly = y + 9;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...GREEN_DARK);
    doc.text(heading, padX, ly);
    ly += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_DARK);
    const nameLines = doc.splitTextToSize(name, boxW - 12);
    doc.text(nameLines, padX, ly);
    ly += nameLines.length * 4.6 + 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_MUTED);
    if (addressLine) {
      const addrLines = doc.splitTextToSize(addressLine, boxW - 12);
      doc.text(addrLines, padX, ly);
      ly += addrLines.length * 4.2;
    }
    if (phone) { doc.text(`Ph: ${phone}`, padX, ly); ly += 4.2; }
    if (gstin) { doc.text(`GSTIN/UIN: ${gstin}`, padX, ly); ly += 4.2; }
  }

  renderInfoBox(MARGIN, "Quotation by:", input.company.businessName, input.company.addressLine,
    input.company.phone, input.company.gstNumber);
  renderInfoBox(rightBoxX, "Quotation to:", input.customer.name, input.customer.addressLine,
    input.customer.phone, input.customer.gstin ?? undefined);

  // ── Item table header (dark green) ───────────────────────────
  const colDesc = MARGIN + 6, colPax = MARGIN + CONTENT_W * 0.52, colPrice = MARGIN + CONTENT_W * 0.68, colTotal = MARGIN + CONTENT_W - 6;
  const tableH = 11;
  const rowH = 8;
  // Matches the reference template's generously-sized panel — items sit at
  // the top, totals stay pinned near the bottom, so a 1-2 item quotation
  // still gets the same roomy card instead of looking cramped.
  const MIN_ITEM_ROWS = 4;
  const totalsBlockH = 26;

  function drawItemTableHeader(headerY: number) {
    doc.setFillColor(...GREEN_DARK);
    doc.roundedRect(MARGIN, headerY, CONTENT_W, tableH, 3, 3, "F");
    doc.rect(MARGIN, headerY + 5, CONTENT_W, tableH - 5, "F"); // square off the bottom corners so it joins the panel below
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text("ITEM DESCRIPTION", colDesc, headerY + 7.2);
    doc.text("PAX", colPax, headerY + 7.2);
    doc.text("PRICE", colPrice, headerY + 7.2);
    doc.text("TOTAL", colTotal, headerY + 7.2, { align: "right" });
  }

  y += boxH + 8;
  drawItemTableHeader(y);

  // ── Item rows + totals (light green panel), paginated ─────────
  // With enough line items, a single fixed-height panel would either
  // overlap the footer bar or run past the bottom of the page and get
  // silently clipped (jsPDF never auto-flows content onto a new page) — so
  // rows are chunked across as many pages as needed, and the totals block
  // only renders with the final chunk once every item has a home.
  let remaining = input.lineItems.slice();
  let panelY = y + tableH - 3;
  let panelH = 0;
  let isFirstChunk = true;

  while (remaining.length > 0 || isFirstChunk) {
    const availableH = MAX_CONTENT_Y - panelY;
    const fitsWithTotals = remaining.length * rowH + totalsBlockH <= availableH;
    let rowsThisPage = fitsWithTotals
      ? remaining.length
      : Math.max(1, Math.floor(availableH / rowH));
    // If the no-totals row cap would still consume every remaining item,
    // this page would wrongly look like the last one and get the totals
    // block appended without room for it — hold back one item so it (and
    // the totals) spill onto a fresh page instead.
    if (!fitsWithTotals && rowsThisPage >= remaining.length) {
      rowsThisPage = Math.max(1, remaining.length - 1);
    }
    const chunk = remaining.slice(0, rowsThisPage);
    remaining = remaining.slice(rowsThisPage);
    const isLastChunk = remaining.length === 0;

    const displayRows = isFirstChunk && isLastChunk ? Math.max(chunk.length, MIN_ITEM_ROWS) : chunk.length;
    const itemsBlockH = displayRows * rowH + 6;
    panelH = itemsBlockH + (isLastChunk ? totalsBlockH : 0);

    doc.setFillColor(...GREEN_LIGHT);
    doc.rect(MARGIN, panelY, CONTENT_W, panelH - 6, "F");
    doc.roundedRect(MARGIN, panelY + panelH - 12, CONTENT_W, 12, 3, 3, "F"); // rounded bottom corners

    if (isLastChunk && input.logoDataUrl) {
      try {
        const gState = new (doc as unknown as { GState: new (o: object) => unknown }).GState({ opacity: 0.06 });
        (doc as unknown as { setGState: (g: unknown) => void }).setGState(gState);
        doc.addImage(input.logoDataUrl, "PNG", MARGIN + 4, panelY + panelH - 26, 48, 15.2);
        (doc as unknown as { setGState: (g: unknown) => void }).setGState(
          new (doc as unknown as { GState: new (o: object) => unknown }).GState({ opacity: 1 })
        );
      } catch { /* watermark is decorative — skip on failure */ }
    }

    let rowY = panelY + 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_DARK);
    for (const item of chunk) {
      const descLines = doc.splitTextToSize(item.description, CONTENT_W * 0.48);
      doc.text(descLines, colDesc, rowY);
      doc.text(item.pax != null && item.pax > 0 ? String(item.pax) : "-", colPax, rowY);
      doc.text(`₹${formatINR(item.price)}`, colPrice, rowY);
      doc.setFont("helvetica", "bold");
      doc.text(`₹${formatINR(item.total)}`, colTotal, rowY, { align: "right" });
      doc.setFont("helvetica", "normal");
      rowY += rowH;
    }

    if (isLastChunk) {
      const totalsY = panelY + itemsBlockH + 6;
      doc.setDrawColor(180, 200, 190);
      doc.line(MARGIN + CONTENT_W * 0.55, totalsY - 4, MARGIN + CONTENT_W - 6, totalsY - 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...TEXT_DARK);
      doc.text("TOTAL", colPrice, totalsY);
      doc.text(`₹${formatINR(input.subtotal)}`, colTotal, totalsY, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("GRAND TOTAL", colPrice, totalsY + 8);
      doc.text(`₹${formatINR(input.grandTotal)}`, colTotal, totalsY + 8, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...TEXT_MUTED);
      doc.text("INVOICE TOTAL (IN WORDS)", colDesc, totalsY + 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_DARK);
      const wordsLines = doc.splitTextToSize(numberToIndianWords(Math.round(input.grandTotal)), CONTENT_W * 0.55);
      doc.text(wordsLines, colDesc, totalsY + 19);
    } else {
      doc.addPage();
      y = MARGIN;
      drawItemTableHeader(y);
      panelY = y + tableH - 3;
    }
    isFirstChunk = false;
  }

  // ── Payable To + Terms boxes ──────────────────────────────────
  y = panelY + panelH + 8;
  const lowerBoxH = 52;
  if (y + lowerBoxH + 25 > PAGE_H) {
    // Not enough room left for the payment/terms boxes + footer bar —
    // continue on a fresh page rather than letting them run off the page.
    doc.addPage();
    y = MARGIN;
  }
  doc.setFillColor(...GREEN_LIGHT);
  doc.roundedRect(MARGIN, y, boxW, lowerBoxH, 3, 3, "F");
  doc.roundedRect(rightBoxX, y, boxW, lowerBoxH, 3, 3, "F");

  let py = y + 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GREEN_DARK);
  doc.text("Payable To", MARGIN + 6, py);
  py += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.text(input.bank.accountName || "-", MARGIN + 6, py);
  py += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Bank Details", MARGIN + 6, py);
  py += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("Account Number", MARGIN + 6, py); py += 4;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_DARK);
  doc.text(input.bank.accountNumber || "-", MARGIN + 6, py); py += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_MUTED);
  doc.text("IFSC Code", MARGIN + 6, py); py += 4;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_DARK);
  doc.text(input.bank.ifsc || "-", MARGIN + 6, py); py += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_MUTED);
  doc.text("Bank", MARGIN + 6, py); py += 4;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_DARK);
  doc.text(input.bank.bankName || "-", MARGIN + 6, py);

  if (input.bank.qrDataUrl) {
    try { doc.addImage(input.bank.qrDataUrl, "PNG", MARGIN + boxW - 30, y + 8, 22, 22); } catch { /* skip */ }
  }

  let ty = y + 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GREEN_DARK);
  doc.text("Terms and conditions:", rightBoxX + 6, ty);
  ty += 6.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  doc.setTextColor(...TEXT_DARK);
  for (const term of input.terms) {
    const lines = doc.splitTextToSize(`•  ${term}`, boxW - 12);
    doc.text(lines, rightBoxX + 6, ty);
    ty += lines.length * 4.3 + 1.5;
  }

  // ── Footer (dark green bar) ───────────────────────────────────
  const footerY = 280;
  doc.setFillColor(...GREEN_DARK);
  doc.rect(0, footerY, PAGE_W, 17, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  if (input.company.phone) doc.text(`+91 ${input.company.phone}`, MARGIN, footerY + 10);
  if (input.websiteUrl) doc.text(input.websiteUrl, PAGE_W / 2, footerY + 10, { align: "center" });
  if (input.socialHandle) doc.text(input.socialHandle, PAGE_W - MARGIN, footerY + 10, { align: "right" });

  return doc;
}

export async function downloadQuotationPdf(input: QuotationPdfInput): Promise<void> {
  const doc = await buildQuotationPdfDoc(input);
  doc.save(`Quotation-${input.refNumber}.pdf`);
}

export async function generateQuotationPdfBlob(input: QuotationPdfInput): Promise<Blob> {
  const doc = await buildQuotationPdfDoc(input);
  return doc.output("blob");
}
