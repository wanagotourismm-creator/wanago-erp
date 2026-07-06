import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Package } from "@/modules/packages/types";

export class PackageRepository extends BaseRepository<Package> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.PACKAGES);
  }
}

export const packageRepository = new PackageRepository();
