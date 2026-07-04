import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Booking } from "@/modules/bookings/types";

export class BookingRepository extends BaseRepository<Booking> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.BOOKINGS);
  }
}

export const bookingRepository = new BookingRepository();
