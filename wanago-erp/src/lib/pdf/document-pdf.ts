// A real document layout (company header, customer block, line items,
// subtotal/tax/total footer) — built on the same jsPDF + jspdf-autotable
// already used by src/lib/pdf-export.ts (dynamically imported there too,
// no new dependency). exportTableToPdf is a generic tabular dump; this is
// for an actual Invoice/Quotation document sent to a customer.

export type DocumentLineItem = { description: string; amount: number };

export type DocumentPdfInput = {
  type: "invoice" | "quotation";
  refNumber: string;
  date: string;
  dueDateOrValidUntil?: string | null;
  company: {
    businessName: string;
    address?:  string;
    city?:     string;
    phone?:    string;
    email?:    string;
    gstNumber?: string;
    gstEnabled: boolean;
  };
  customer: {
    name:  string;
    phone?: string;
    email?: string | null;
  };
  lineItems:   DocumentLineItem[];
  subtotal:    number;
  taxRate?:    number | null;
  taxAmount?:  number | null;
  totalAmount: number;
  amountPaid?: number;   // invoice only
  balanceDue?: number;   // invoice only
  notes?:      string | null;
};

export async function generateDocumentPdf(input: DocumentPdfInput): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "portrait" });
  const title = input.type === "invoice" ? "INVOICE" : "QUOTATION";

  // Company header (top-left)
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20);
  doc.text(input.company.businessName, 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  let headerY = 24;
  for (const line of [
    input.company.address,
    input.company.city,
    input.company.phone ? `Phone: ${input.company.phone}` : undefined,
    input.company.email ? `Email: ${input.company.email}` : undefined,
    input.company.gstEnabled && input.company.gstNumber ? `GSTIN: ${input.company.gstNumber}` : undefined,
  ]) {
    if (!line) continue;
    doc.text(line, 14, headerY);
    headerY += 5;
  }

  // Document title + meta (top-right)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20);
  doc.text(title, 196, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Ref: ${input.refNumber}`, 196, 26, { align: "right" });
  doc.text(`Date: ${input.date}`, 196, 31, { align: "right" });
  if (input.dueDateOrValidUntil) {
    const label = input.type === "invoice" ? "Due" : "Valid Until";
    doc.text(`${label}: ${input.dueDateOrValidUntil}`, 196, 36, { align: "right" });
  }

  // Customer block
  const custStartY = Math.max(headerY, 40) + 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20);
  doc.text(input.type === "invoice" ? "Bill To:" : "Prepared For:", 14, custStartY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  let custY = custStartY + 5;
  for (const line of [input.customer.name, input.customer.phone, input.customer.email ?? undefined]) {
    if (!line) continue;
    doc.text(line, 14, custY);
    custY += 5;
  }

  // Line items
  autoTable(doc, {
    startY: custY + 6,
    head: [["Description", "Amount"]],
    body: input.lineItems.map((li) => [li.description, li.amount.toFixed(2)]),
    theme: "grid",
    headStyles: { fillColor: [22, 74, 50] },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" } },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? custY + 20;

  // Totals footer
  let ty = finalY + 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("Subtotal:", 150, ty);
  doc.text(input.subtotal.toFixed(2), 196, ty, { align: "right" });
  ty += 6;

  if (input.company.gstEnabled && input.taxAmount) {
    doc.text(`Tax (${input.taxRate ?? 0}%):`, 150, ty);
    doc.text(input.taxAmount.toFixed(2), 196, ty, { align: "right" });
    ty += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(20);
  doc.text("Total:", 150, ty);
  doc.text(input.totalAmount.toFixed(2), 196, ty, { align: "right" });
  ty += 7;

  if (input.type === "invoice" && input.amountPaid !== undefined) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text("Paid:", 150, ty);
    doc.text(input.amountPaid.toFixed(2), 196, ty, { align: "right" });
    ty += 6;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.text("Balance Due:", 150, ty);
    doc.text((input.balanceDue ?? 0).toFixed(2), 196, ty, { align: "right" });
    ty += 6;
  }

  if (input.notes) {
    ty += 8;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Notes: ${input.notes}`, 14, ty, { maxWidth: 180 });
  }

  doc.save(`${input.type}-${input.refNumber}.pdf`);
}
