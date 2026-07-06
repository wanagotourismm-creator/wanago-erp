import * as XLSX from "xlsx";

// Reads a .csv or .xlsx file and returns rows keyed by header, with every
// cell coerced to a string — regardless of source format. This matters
// because every module's existing Zod schema already coerces string
// form-input values (z.coerce.number(), etc.), so parsed spreadsheet rows
// can be validated with the exact same schema used by the manual "Add"
// form, no separate spreadsheet-specific schema needed.
export async function parseSpreadsheetFile(file: File): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,
    defval: "",
  });
  return rows;
}
