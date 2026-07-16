import type { Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { getAppUrl } from "@/lib/app-url";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";

// Shared by the public booking-link status route and its PDF-download
// route — both need "the most recent Quotation/Booking/Invoice tied to
// this customer," just summarized differently (a status snapshot vs. the
// full record needed to rebuild a PDF).

type AnyDoc = { id: string } & Record<string, unknown>;

function pickLatest(docs: QueryDocumentSnapshot[]): AnyDoc | null {
  if (docs.length === 0) return null;
  const sorted = [...docs].sort((a, b) => {
    const at = (a.data().createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
    const bt = (b.data().createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
    return bt - at;
  });
  const top = sorted[0];
  return { id: top.id, ...top.data() };
}

export async function fetchCustomerTrackingDocs(db: Firestore, customerId: string): Promise<{
  quotation: AnyDoc | null;
  booking:   AnyDoc | null;
  invoice:   AnyDoc | null;
}> {
  const [qSnap, bSnap, iSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.QUOTATIONS).where("customerId", "==", customerId).get(),
    db.collection(FIRESTORE_COLLECTIONS.BOOKINGS).where("customerId", "==", customerId).get(),
    db.collection(FIRESTORE_COLLECTIONS.INVOICES).where("customerId", "==", customerId).get(),
  ]);
  return {
    quotation: pickLatest(qSnap.docs),
    booking:   pickLatest(bSnap.docs),
    invoice:   pickLatest(iSnap.docs),
  };
}

// Reads an image and returns it as a data URI — Node has no FileReader, so
// this can't reuse the browser-only loadImageAsDataUrl in quotation-pdf.ts.
// Same pattern already used by the itinerary-brochures PDF route. Prefers
// the tenant's own uploaded logo (CompanySettings.logoUrl), falls back to
// the bundled asset off the deployed site's own CDN when none is set.
export async function loadLogoDataUriServer(): Promise<string> {
  const company = await getCompanySettingsServer();
  const url = company.logoUrl || `${getAppUrl()}/images/logo-dark-clean.png`;
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
