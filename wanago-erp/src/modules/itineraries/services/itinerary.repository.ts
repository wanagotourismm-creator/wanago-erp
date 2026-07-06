import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Itinerary } from "@/modules/itineraries/types";

export class ItineraryRepository extends BaseRepository<Itinerary> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.ITINERARIES);
  }
}

export const itineraryRepository = new ItineraryRepository();
