import type { FirestoreRecord } from "@/types/global";

export type TallyMappingSourceType = "expense_category" | "system";

// The five system accounts every export needs a ledger name for — these
// are assumed to already exist in Tally with correct GST/rate config (see
// tally-export.service.ts's buildTallyXml comment); the export never
// auto-creates them, only references them by the mapped name.
export const SYSTEM_MAPPING_KEYS = {
  SALES_ACCOUNT: "SALES_ACCOUNT",
  OUTPUT_CGST:   "OUTPUT_CGST",
  OUTPUT_SGST:   "OUTPUT_SGST",
  CASH:          "CASH",
  BANK:          "BANK",
} as const;

export type TallyMapping = FirestoreRecord & {
  sourceType: TallyMappingSourceType;
  // Free-text expense category (e.g. "Travel") for sourceType "expense_category",
  // or one of SYSTEM_MAPPING_KEYS for sourceType "system".
  sourceKey:        string;
  tallyLedgerName:  string;
  tallyParentGroup: string;
};

export type TallyMappingFormData = Omit<TallyMapping, "id" | "createdAt" | "updatedAt" | "status" | "createdBy">;

export type TallyExportFormat = "xml" | "csv";

// A log entry, not a file store — re-running the same period regenerates
// the export identically, so there's no need to persist the (potentially
// large) generated content itself.
export type TallyExportLog = FirestoreRecord & {
  periodStart: string;
  periodEnd:   string;
  format:      TallyExportFormat;
  invoiceCount: number;
  paymentCount: number;
  expenseCount: number;
  unmappedExpenseCategories: string[];
  exportedBy:     string;
  exportedByName: string;
};
