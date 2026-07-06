import type { Office } from "@/modules/admin/offices/types";

// Every bulk-importable module has officeId/officeName. An optional
// "Office" column lets a row specify one by name (case-insensitive
// match); otherwise it falls back to the importing user's own office —
// the common case being staff bulk-importing records for their own office.
export function resolveOffice(
  officeColumnValue: string | undefined,
  offices: Office[],
  currentUserOffice: { officeId: string; officeName: string }
): { officeId: string; officeName: string } {
  const trimmed = officeColumnValue?.trim();
  if (!trimmed) return currentUserOffice;

  const match = offices.find((o) => o.name.toLowerCase() === trimmed.toLowerCase());
  if (!match) return currentUserOffice;

  return { officeId: match.id, officeName: match.name };
}
