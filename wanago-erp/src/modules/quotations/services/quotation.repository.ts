import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Quotation } from "@/modules/quotations/types";

export class QuotationRepository extends BaseRepository<Quotation> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.QUOTATIONS);
  }
}

export const quotationRepository = new QuotationRepository();
