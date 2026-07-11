import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { ItineraryBrochure } from "@/modules/itinerary-brochures/types";

export class ItineraryBrochureRepository extends BaseRepository<ItineraryBrochure> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.ITINERARY_BROCHURES);
  }
}

export const itineraryBrochureRepository = new ItineraryBrochureRepository();
