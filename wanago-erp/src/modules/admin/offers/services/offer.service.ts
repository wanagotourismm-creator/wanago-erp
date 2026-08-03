import { orderBy } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Offer, OfferFormData } from "@/modules/admin/offers/types";

class OfferRepository extends BaseRepository<Offer> {
  constructor() { super(FIRESTORE_COLLECTIONS.OFFERS); }
}
const repo = new OfferRepository();

export async function fetchOffers(): Promise<Offer[]> {
  return repo.findMany({ constraints: [orderBy("validTo", "desc")] });
}

export async function createOffer(data: OfferFormData, createdBy: string): Promise<Offer> {
  return repo.create({ ...data, createdBy, status: "active" });
}

export async function updateOffer(id: string, data: Partial<OfferFormData>): Promise<void> {
  return repo.update(id, data);
}

export async function deleteOffer(id: string): Promise<void> {
  return repo.delete(id);
}
