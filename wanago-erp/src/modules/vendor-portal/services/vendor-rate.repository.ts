import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { VendorRate } from "@/modules/vendor-portal/types";

export class VendorRateRepository extends BaseRepository<VendorRate> {
  constructor() { super(FIRESTORE_COLLECTIONS.VENDOR_RATES); }
}

export const vendorRateRepository = new VendorRateRepository();
