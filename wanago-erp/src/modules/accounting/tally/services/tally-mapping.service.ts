import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { SYSTEM_MAPPING_KEYS } from "@/modules/accounting/tally/types";
import type { TallyMapping, TallyMappingFormData } from "@/modules/accounting/tally/types";

class TallyMappingRepository extends BaseRepository<TallyMapping> {
  constructor() { super(FIRESTORE_COLLECTIONS.TALLY_MAPPINGS); }
}
const repo = new TallyMappingRepository();

// Ships with sane defaults so a fresh install isn't an empty table — same
// idiom as DEFAULT_INCENTIVE_SETTINGS/DEFAULT_REVIEW_SETTINGS, just one row
// per system account instead of one settings doc. These five are assumed to
// already exist in Tally with correct GST/rate configuration (see
// tally-export.service.ts) — only the ledger *name* is configurable here.
export const DEFAULT_SYSTEM_MAPPINGS: Record<string, { tallyLedgerName: string; tallyParentGroup: string }> = {
  [SYSTEM_MAPPING_KEYS.SALES_ACCOUNT]: { tallyLedgerName: "Sales Account",  tallyParentGroup: "Sales Accounts" },
  [SYSTEM_MAPPING_KEYS.OUTPUT_CGST]:   { tallyLedgerName: "Output CGST",    tallyParentGroup: "Duties & Taxes" },
  [SYSTEM_MAPPING_KEYS.OUTPUT_SGST]:   { tallyLedgerName: "Output SGST",    tallyParentGroup: "Duties & Taxes" },
  [SYSTEM_MAPPING_KEYS.CASH]:          { tallyLedgerName: "Cash",           tallyParentGroup: "Cash-in-Hand" },
  [SYSTEM_MAPPING_KEYS.BANK]:          { tallyLedgerName: "Bank",           tallyParentGroup: "Bank Accounts" },
};

// Merges stored mappings with any missing system defaults so the table
// always shows all five system rows, even before an admin has touched
// anything — same "{...DEFAULT, ...stored}" idea as the settings modules,
// applied per-row instead of to one doc.
export async function fetchTallyMappings(): Promise<TallyMapping[]> {
  const stored = await repo.findMany();
  const missingSystemRows = Object.entries(DEFAULT_SYSTEM_MAPPINGS)
    .filter(([key]) => !stored.some((m) => m.sourceType === "system" && m.sourceKey === key))
    .map(([key, defaults]): TallyMapping => ({
      id: `default_${key}`,
      createdAt: new Date(), updatedAt: new Date(), createdBy: "system", status: "active",
      sourceType: "system",
      sourceKey: key,
      ...defaults,
    }));
  return [...stored, ...missingSystemRows];
}

export async function createTallyMapping(data: TallyMappingFormData, createdBy: string): Promise<TallyMapping> {
  return repo.create({ ...data, createdBy, status: "active" });
}

// A "default_*" id means this row hasn't actually been saved yet (it's a
// DEFAULT_SYSTEM_MAPPINGS placeholder from fetchTallyMappings) — editing it
// creates the real row instead of trying to update a document that doesn't
// exist.
export async function updateTallyMapping(
  id: string, data: Partial<TallyMappingFormData>, createdBy: string
): Promise<void> {
  if (id.startsWith("default_")) {
    const sourceKey = id.slice("default_".length);
    const defaults = DEFAULT_SYSTEM_MAPPINGS[sourceKey];
    await repo.create({
      sourceType: "system", sourceKey,
      tallyLedgerName: defaults.tallyLedgerName, tallyParentGroup: defaults.tallyParentGroup,
      ...data,
      createdBy,
      status: "active",
    });
    return;
  }
  await repo.update(id, data);
}

export async function deleteTallyMapping(id: string): Promise<void> {
  if (id.startsWith("default_")) return; // nothing persisted to delete
  return repo.delete(id);
}
