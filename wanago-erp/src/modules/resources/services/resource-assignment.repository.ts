import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { ResourceAssignment } from "@/modules/resources/types";

export class ResourceAssignmentRepository extends BaseRepository<ResourceAssignment> {
  constructor() { super(FIRESTORE_COLLECTIONS.RESOURCE_ASSIGNMENTS); }
}

export const resourceAssignmentRepository = new ResourceAssignmentRepository();
