import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Supplier } from "@/modules/suppliers/types";

export class SupplierRepository extends BaseRepository<Supplier> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.SUPPLIERS);
  }
}

export const supplierRepository = new SupplierRepository();
