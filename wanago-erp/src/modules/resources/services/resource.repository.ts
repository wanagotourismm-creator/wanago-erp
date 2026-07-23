import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Resource } from "@/modules/resources/types";

export class ResourceRepository extends BaseRepository<Resource> {
  constructor() { super(FIRESTORE_COLLECTIONS.RESOURCES); }
}

export const resourceRepository = new ResourceRepository();
