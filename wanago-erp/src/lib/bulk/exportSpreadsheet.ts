import * as XLSX from "xlsx";

// Writes a real .xlsx binary — a companion to the existing exportToCsv
// (src/lib/csv-export.ts, left untouched so Reports keeps working
// unmodified). Same "array of flat row objects" input shape as that one,
// so a module's export mapping can feed either interchangeably.
export function exportRowsToXlsx(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  XLSX.writeFile(workbook, filename);
}
