import { auth } from "@/lib/firebase/client";
import { uploadFile, listFiles } from "@/lib/storage/upload";
import { itineraryBrochureRepository } from "@/modules/itinerary-brochures/services/itinerary-brochure.repository";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import type { ItineraryBrochure, ItineraryBrochureFormData } from "@/modules/itinerary-brochures/types";

// Sorted client-side (not via Firestore orderBy) so filtered queries only
// need single-field indexes — same convention as the itineraries module.
export async function fetchItineraryBrochures(): Promise<ItineraryBrochure[]> {
  const brochures = await itineraryBrochureRepository.findMany();
  return brochures.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchItineraryBrochureById(id: string): Promise<ItineraryBrochure | null> {
  return itineraryBrochureRepository.findById(id);
}

export async function createItineraryBrochure(
  data: ItineraryBrochureFormData,
  createdBy: string
): Promise<ItineraryBrochure> {
  const refNumber = await nextRefNumber("ITINERARY_BROCHURE");

  return itineraryBrochureRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:       "active",
    route:        data.route || null,
    tagline:      data.tagline || null,
    customerName: data.customerName || null,
    packagePrice: data.packagePrice ?? null,
    pdfUrl:         null,
    pdfGeneratedAt: null,
  });
}

export async function updateItineraryBrochure(
  id: string,
  data: Partial<ItineraryBrochureFormData>
): Promise<void> {
  // Any content edit invalidates the previously generated PDF — the detail
  // page's "Regenerate" action re-derives it from the new field values.
  return itineraryBrochureRepository.update(id, { ...data, pdfUrl: null, pdfGeneratedAt: null } as Partial<ItineraryBrochure>);
}

export async function deleteItineraryBrochure(id: string): Promise<void> {
  return itineraryBrochureRepository.delete(id);
}

// "Duplicate from existing" — reuse a past itinerary's full content as the
// starting point for a new one, since the same destinations (Thailand,
// Vietnam, Matheran) get booked repeatedly with only small edits.
export async function duplicateItineraryBrochure(
  source: ItineraryBrochure,
  createdBy: string
): Promise<ItineraryBrochure> {
  const data: ItineraryBrochureFormData = {
    destination:        source.destination,
    route:              source.route,
    tagline:            source.tagline,
    durationDays:       source.durationDays,
    durationNights:      source.durationNights,
    coverImageUrl:      source.coverImageUrl,
    days:               source.days,
    inclusions:         source.inclusions,
    exclusions:         source.exclusions,
    termsAndConditions: source.termsAndConditions,
    contactPhones:      source.contactPhones,
    officeAddresses:    source.officeAddresses,
    customerName:       null,
    packagePrice:       source.packagePrice,
    brochureStatus:     "draft",
    createdBy,
  };
  return createItineraryBrochure(data, createdBy);
}

// Reusable destination-photo library — uploaded once, referenced across
// many brochures (cover image and per-day images) instead of re-uploading
// the same photo for every new itinerary.
export async function uploadBrochureImage(file: File): Promise<string> {
  return uploadFile(`itinerary-images/${Date.now()}-${file.name}`, file);
}

// Lists every photo ever uploaded to the shared `itinerary-images/` prefix
// so the builder can offer "pick from library" instead of only "upload
// new" — there's no separate Firestore index of uploads, Storage's own
// `listAll` is the source of truth and is cheap enough for a folder of
// destination photos (dozens-hundreds, not thousands).
export async function fetchBrochureImageLibrary(): Promise<string[]> {
  return listFiles("itinerary-images");
}

// Triggers server-side Puppeteer generation (src/app/api/itinerary-brochures/[id]/pdf)
// and returns the resulting Storage URL. Used for both "Download" (first
// generation) and "Regenerate" (pdfUrl was cleared by an edit) — the route
// itself doesn't distinguish the two, it always re-renders from current data.
export async function generateBrochurePdf(id: string): Promise<string> {
  const idToken = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/itinerary-brochures/${id}/pdf`, {
    method: "POST",
    headers: idToken ? { authorization: `Bearer ${idToken}` } : {},
  });
  if (!res.ok) throw new Error("PDF generation failed");
  const data = await res.json();
  return data.pdfUrl as string;
}
