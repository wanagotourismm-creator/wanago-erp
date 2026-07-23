import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { VendorAvailability } from "@/modules/vendor-portal/types";

export class VendorAvailabilityRepository extends BaseRepository<VendorAvailability> {
  constructor() { super(FIRESTORE_COLLECTIONS.VENDOR_AVAILABILITY); }
}

export const vendorAvailabilityRepository = new VendorAvailabilityRepository();
