import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Office } from "@/modules/admin/offices/types";

export class OfficeRepository extends BaseRepository<Office> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.OFFICES);
  }
}

export const officeRepository = new OfficeRepository();
