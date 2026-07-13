import type { Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

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

// Reads an image off the deployed site's own CDN and returns it as a data
// URI — Node has no FileReader, so this can't reuse the browser-only
// loadImageAsDataUrl in quotation-pdf.ts. Same pattern already used by the
// itinerary-brochures PDF route.
export async function loadLogoDataUriServer(): Promise<string> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://wanago-erp.vercel.app";
  const res = await fetch(`${base}/images/logo-dark-clean.png`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
