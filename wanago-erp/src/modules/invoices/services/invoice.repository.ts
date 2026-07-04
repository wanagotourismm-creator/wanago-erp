import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Invoice } from "@/modules/invoices/types";

export class InvoiceRepository extends BaseRepository<Invoice> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.INVOICES);
  }
}

export const invoiceRepository = new InvoiceRepository();
