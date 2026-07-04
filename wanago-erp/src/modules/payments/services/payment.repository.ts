import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Payment } from "@/modules/payments/types";

export class PaymentRepository extends BaseRepository<Payment> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.PAYMENTS);
  }
}

export const paymentRepository = new PaymentRepository();
