import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Payment } from "@/modules/payments/types";
import { paymentDocumentSchema } from "@/modules/payments/schemas/document";

export class PaymentRepository extends BaseRepository<Payment> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.PAYMENTS, paymentDocumentSchema);
  }
}

export const paymentRepository = new PaymentRepository();
