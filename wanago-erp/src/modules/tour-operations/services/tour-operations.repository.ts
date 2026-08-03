import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { OperationsBooking } from "@/modules/tour-operations/types";

export class TourOperationsRepository extends BaseRepository<OperationsBooking> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.OPERATIONS_BOOKINGS);
  }
}

export const tourOperationsRepository = new TourOperationsRepository();
