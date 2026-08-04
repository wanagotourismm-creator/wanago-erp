// Customer-facing trip checklist PDF — generated automatically once
// Operations finishes the pre-departure checklist (see
// tour-operations.service.ts's generateAndShareChecklistPdf). Simpler,
// single-column layout than quotation-pdf.ts/invoice-pdf.ts's branded
// template since this is a reference document (hotel/transport/guide/
// itinerary confirmation), not a priced sales document.

export type ChecklistSection = { heading: string; lines: string[] };

export type OperationsChecklistPdfInput = {
  refNumber: string;
  customerName: string;
  destination: string;
  travelDate: string | null; // pre-formatted
  returnDate: string | null; // pre-formatted
  company: { businessName: string; phone?: string; websiteUrl?: string };
  sections: ChecklistSection[];
  logoDataUrl: string;
};

const GREEN_DARK: [number, number, number] = [22, 74, 50];
const TEXT_DARK: [number, number, number] = [20, 20, 20];
const TEXT_MUTED: [number, number, number] = [90, 90, 90];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
const MAX_CONTENT_Y = 270;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildChecklistPdfDoc(input: OperationsChecklistPdfInput): Promise<any> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = 18;
  if (input.logoDataUrl) {
    try { doc.addImage(input.logoDataUrl, "PNG", MARGIN, y - 6, 38, 12); } catch { /* skip */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...GREEN_DARK);
  doc.text("Trip Checklist", PAGE_W - MARGIN, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(input.refNumber, PAGE_W - MARGIN, y, { align: "right" });

  y += 12;
  doc.setDrawColor(...GREEN_DARK);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text(input.customerName, MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Destination: ${input.destination}`, MARGIN, y);
  y += 5;
  if (input.travelDate || input.returnDate) {
    doc.text(`Travel: ${input.travelDate ?? "TBD"}  —  Return: ${input.returnDate ?? "TBD"}`, MARGIN, y);
    y += 5;
  }
  y += 6;

  function ensureRoom(needed: number) {
    if (y + needed > MAX_CONTENT_Y) {
      doc.addPage();
      y = MARGIN;
    }
  }

  for (const section of input.sections) {
    ensureRoom(14);
    doc.setFillColor(...GREEN_DARK);
    doc.rect(MARGIN, y, CONTENT_W, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(section.heading, MARGIN + 4, y + 5.6);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_DARK);
    for (const line of section.lines) {
      const wrapped = doc.splitTextToSize(`•  ${line}`, CONTENT_W - 4);
      ensureRoom(wrapped.length * 5 + 2);
      doc.text(wrapped, MARGIN + 2, y);
      y += wrapped.length * 5 + 2;
    }
    y += 5;
  }

  const footerY = PAGE_H - 14;
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, footerY, PAGE_W - MARGIN, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  const footerParts = [input.company.businessName, input.company.phone ? `+91 ${input.company.phone}` : null, input.company.websiteUrl ?? null].filter(Boolean);
  doc.text(footerParts.join("  ·  "), PAGE_W / 2, footerY + 6, { align: "center" });

  return doc;
}

export async function generateOperationsChecklistPdfBlob(input: OperationsChecklistPdfInput): Promise<Blob> {
  const doc = await buildChecklistPdfDoc(input);
  return doc.output("blob");
}
