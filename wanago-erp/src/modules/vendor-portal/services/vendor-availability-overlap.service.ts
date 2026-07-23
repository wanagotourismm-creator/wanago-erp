import { dateRangesOverlap } from "@/modules/resources/services/conflict.service";
import type { VendorAvailability } from "@/modules/vendor-portal/types";

// Non-blocking, purely informational — a vendor isn't a single schedulable
// instance the way a Resource is, so two overlapping vendor-submitted
// windows for the same resourceLabel aren't a save-blocking conflict, just
// worth flagging (e.g. an update that superseded an older, never-deleted
// entry). Only compares entries for the same supplier + resourceLabel.
export function findOverlappingAvailability(
  entries: VendorAvailability[]
): Array<[VendorAvailability, VendorAvailability]> {
  const overlaps: Array<[VendorAvailability, VendorAvailability]> = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (entries[i].supplierId !== entries[j].supplierId) continue;
      if (entries[i].resourceLabel !== entries[j].resourceLabel) continue;
      if (dateRangesOverlap(entries[i], entries[j])) {
        overlaps.push([entries[i], entries[j]]);
      }
    }
  }
  return overlaps;
}
