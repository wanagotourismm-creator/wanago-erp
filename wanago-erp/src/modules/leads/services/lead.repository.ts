import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Lead } from "@/modules/leads/types";

export class LeadRepository extends BaseRepository<Lead> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.LEADS);
  }
}

export const leadRepository = new LeadRepository();
