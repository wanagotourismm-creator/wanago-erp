// The company's branded Invoice PDF — matches the reference template: letter-
// spaced "I N V O I C E" heading with the logo top-right, Issued To / Pay To
// columns, a dark-green item table (Description/Pax/Price/Total), a
// Grand Total / Advance Received / Pending Amount summary with the pending
// amount spelled out in words, a red "PAYMENT RECEIVED" stamp once the
// balance is fully paid, and a dark-green footer bar — same jsPDF approach
// as quotation-pdf.ts so the download button and auto-email flow render
// byte-identical PDFs.

import { numberToIndianWords } from "@/lib/utils/number-to-words";

export type InvoicePdfLineItem = { description: string; pax: number | null; price: number; total: number };

export type InvoicePdfInput = {
  refNumber: string;
  date: string; // pre-formatted, e.g. "26/06/2026"
  dueDate?: string | null;
  company: {
    businessName: string;
    addressLine: string;
    phone?: string;
    gstNumber?: string;
  };
  customer: {
    name: string;
    addressLine?: string;
    phone?: string;
    gstin?: string | null;
  };
  lineItems: InvoicePdfLineItem[];
  subtotal: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  bank: { accountName: string; accountNumber: string; ifsc: string; bankName: string; qrDataUrl?: string | null };
  logoDataUrl: string;
  websiteUrl?: string;
  socialHandle?: string;
};

const GREEN_DARK: [number, number, number] = [22, 74, 50];
const GREEN_LIGHT: [number, number, number] = [232, 247, 239];
const TEXT_DARK: [number, number, number] = [20, 20, 20];
const TEXT_MUTED: [number, number, number] = [90, 90, 90];
const RED_STAMP: [number, number, number] = [180, 30, 30];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Same rounding rationale as quotation-pdf.ts's formatINR — keeps every
// figure on the PDF consistent with formatCurrency()'s 0-decimal display,
// and avoids the ₹ glyph (not in jsPDF's standard Helvetica font).
function formatINR(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;
}

function letterSpaced(text: string): string {
  return text.split("").join(" ");
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

// Same shared wordmark loader used across quotations/portals/booking pages
// — prefers the tenant's own uploaded logo (CompanySettings.logoUrl), falls
// back to the bundled asset only when none has been uploaded.
export async function loadCompanyLogoDataUrlForInvoice(logoUrl?: string | null): Promise<string | null> {
  if (logoUrl) {
    const custom = await loadImageAsDataUrl(logoUrl);
    if (custom) return custom;
  }
  return loadImageAsDataUrl("/images/logo-dark-clean.png");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildInvoicePdfDoc(input: InvoicePdfInput): Promise<any> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Header: letter-spaced "I N V O I C E" (left) + logo (right) ─
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...GREEN_DARK);
  doc.text(letterSpaced("INVOICE"), MARGIN, 24);

  if (input.logoDataUrl) {
    try {
      doc.addImage(input.logoDataUrl, "PNG", PAGE_W - MARGIN - 42, 10, 42, 13.3);
    } catch { /* bad image data — skip, rest of the PDF still renders */ }
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Invoice No: ${input.refNumber}`, PAGE_W - MARGIN, 28, { align: "right" });
  doc.text(`Date: ${input.date}`, PAGE_W - MARGIN, 33, { align: "right" });
  if (input.dueDate) doc.text(`Due: ${input.dueDate}`, PAGE_W - MARGIN, 38, { align: "right" });

  // ── "Issued To / Pay To" boxes ───────────────────────────────
  let y = 46;
  const boxW = (CONTENT_W - 6) / 2;
  const boxH = 40;
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

  renderInfoBox(MARGIN, "Issued To:", input.customer.name, input.customer.addressLine,
    input.customer.phone, input.customer.gstin ?? undefined);
  renderInfoBox(rightBoxX, "Pay To:", input.company.businessName, input.company.addressLine,
    input.company.phone, input.company.gstNumber);

  // ── Item table ────────────────────────────────────────────────
  const colDesc = MARGIN + 6, colPax = MARGIN + CONTENT_W * 0.52, colPrice = MARGIN + CONTENT_W * 0.68, colTotal = MARGIN + CONTENT_W - 6;
  const tableH = 11;
  const rowH = 8;
  const MIN_ITEM_ROWS = 3;

  y += boxH + 8;
  doc.setFillColor(...GREEN_DARK);
  doc.roundedRect(MARGIN, y, CONTENT_W, tableH, 3, 3, "F");
  doc.rect(MARGIN, y + 5, CONTENT_W, tableH - 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPTION", colDesc, y + 7.2);
  doc.text("PAX", colPax, y + 7.2);
  doc.text("PRICE", colPrice, y + 7.2);
  doc.text("TOTAL", colTotal, y + 7.2, { align: "right" });

  const panelY = y + tableH - 3;
  const displayRows = Math.max(input.lineItems.length, MIN_ITEM_ROWS);
  const itemsBlockH = displayRows * rowH + 6;
  const summaryBlockH = 34;
  const panelH = itemsBlockH + summaryBlockH;

  doc.setFillColor(...GREEN_LIGHT);
  doc.rect(MARGIN, panelY, CONTENT_W, panelH - 6, "F");
  doc.roundedRect(MARGIN, panelY + panelH - 12, CONTENT_W, 12, 3, 3, "F");

  let rowY = panelY + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  for (const item of input.lineItems) {
    const descLines = doc.splitTextToSize(item.description, CONTENT_W * 0.48);
    doc.text(descLines, colDesc, rowY);
    doc.text(item.pax != null && item.pax > 0 ? String(item.pax) : "-", colPax, rowY);
    doc.text(`${formatINR(item.price)}`, colPrice, rowY);
    doc.setFont("helvetica", "bold");
    doc.text(`${formatINR(item.total)}`, colTotal, rowY, { align: "right" });
    doc.setFont("helvetica", "normal");
    rowY += rowH;
  }

  // ── Grand Total / Advance Received / Pending Amount summary ────
  const summaryY = panelY + itemsBlockH + 6;
  doc.setDrawColor(180, 200, 190);
  doc.line(MARGIN + CONTENT_W * 0.55, summaryY - 4, MARGIN + CONTENT_W - 6, summaryY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text("GRAND TOTAL", colPrice, summaryY);
  doc.text(`${formatINR(input.grandTotal)}`, colTotal, summaryY, { align: "right" });

  doc.text("ADVANCE RECEIVED", colPrice, summaryY + 6);
  doc.text(`${formatINR(input.amountPaid)}`, colTotal, summaryY + 6, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...(input.balanceDue > 0 ? RED_STAMP : GREEN_DARK));
  doc.text("PENDING AMOUNT", colPrice, summaryY + 14);
  doc.text(`${formatINR(input.balanceDue)}`, colTotal, summaryY + 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("PENDING AMOUNT (IN WORDS)", colDesc, summaryY + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  const pendingWords = input.balanceDue > 0 ? numberToIndianWords(Math.round(input.balanceDue)) : "Nil";
  const wordsLines = doc.splitTextToSize(pendingWords, CONTENT_W * 0.55);
  doc.text(wordsLines, colDesc, summaryY + 25);

  // ── "PAYMENT RECEIVED" stamp — only once the balance is settled ─
  if (input.balanceDue <= 0) {
    doc.setDrawColor(...RED_STAMP);
    doc.setTextColor(...RED_STAMP);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const stampCenterX = MARGIN + CONTENT_W * 0.24;
    const stampCenterY = summaryY + 10;
    doc.setLineWidth(1.1);
    doc.roundedRect(stampCenterX - 30, stampCenterY - 10, 60, 20, 2, 2, "S");
    doc.text("PAYMENT RECEIVED", stampCenterX, stampCenterY + 2, { align: "center", angle: 8 });
    doc.setLineWidth(0.2);
  }

  // ── Bank details ─────────────────────────────────────────────
  let by = panelY + panelH + 10;
  if (by + 40 > PAGE_H - 25) { doc.addPage(); by = MARGIN; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GREEN_DARK);
  doc.text("Payment Details", MARGIN, by);
  by += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  const bankLines = [
    `Account Name: ${input.bank.accountName || "-"}`,
    `Account Number: ${input.bank.accountNumber || "-"}`,
    `IFSC: ${input.bank.ifsc || "-"}  ·  Bank: ${input.bank.bankName || "-"}`,
  ];
  for (const line of bankLines) { doc.text(line, MARGIN, by); by += 4.5; }
  if (input.bank.qrDataUrl) {
    try { doc.addImage(input.bank.qrDataUrl, "PNG", PAGE_W - MARGIN - 22, by - 22, 22, 22); } catch { /* skip */ }
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

export async function downloadInvoicePdf(input: InvoicePdfInput): Promise<void> {
  const doc = await buildInvoicePdfDoc(input);
  doc.save(`Invoice-${input.refNumber}.pdf`);
}

export async function generateInvoicePdfBlob(input: InvoicePdfInput): Promise<Blob> {
  const doc = await buildInvoicePdfDoc(input);
  return doc.output("blob");
}

export async function generateInvoicePdfBuffer(input: InvoicePdfInput): Promise<ArrayBuffer> {
  const doc = await buildInvoicePdfDoc(input);
  return doc.output("arraybuffer");
}
