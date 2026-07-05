// jsPDF/autotable are dynamically imported so they're only downloaded
// when a user actually exports a PDF, instead of bloating every page
// that merely imports this module.
export async function exportTableToPdf(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  filename: string
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [columns],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [22, 74, 50] },
    styles: { fontSize: 8 },
  });

  doc.save(filename);
}
