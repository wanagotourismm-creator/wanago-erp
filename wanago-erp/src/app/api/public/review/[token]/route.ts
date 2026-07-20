import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getReviewSettingsServer, classifyNpsScore } from "@/modules/reviews/settings/services/review-settings.server";
import { FIRESTORE_COLLECTIONS, REF_FORMATS } from "@/lib/constants";

export const runtime = "nodejs";

// No auth of any kind — same security model as /api/public/booking-link/
// [token] and /api/public/referral/[code]: the long random `token` is the
// entire boundary, and this route only ever reads/writes the exact fields
// this feature needs.

type ReviewRequestDoc = {
  bookingRefNumber: string; customerId: string; customerName: string; destination: string;
  officeId: string; officeName: string; assignedTo: string | null; agentName: string | null;
  bookingId: string; respondedAt: unknown;
};

async function findReviewRequestByToken(token: string) {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(FIRESTORE_COLLECTIONS.REVIEW_REQUESTS)
    .where("token", "==", token).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...(snap.docs[0].data() as ReviewRequestDoc) };
}

// Mirrors nextRefNumber() (lib/firebase/ref-counter.ts) but against the
// Admin SDK's transaction API — same duplication as
// /api/public/referral/[code]/route.ts, for the same reason (no
// client-SDK-authenticated user to call the client version as).
async function nextRefNumberAdmin(prefix: keyof typeof REF_FORMATS): Promise<string> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK not configured");
  const pfx = REF_FORMATS[prefix];
  const counterRef = db.collection("refCounters").doc(pfx);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? (snap.data()?.next as number) : 1001;
    tx.set(counterRef, { next: current + 1 });
    return `${pfx}-${current}`;
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await findReviewRequestByToken(token);
  if (!request) return NextResponse.json({ error: "This link isn't valid" }, { status: 404 });

  return NextResponse.json({
    customerName:     request.customerName,
    destination:      request.destination,
    bookingRefNumber: request.bookingRefNumber,
    alreadySubmitted: !!request.respondedAt,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const request = await findReviewRequestByToken(token);
  if (!request) return NextResponse.json({ error: "This link isn't valid" }, { status: 404 });
  if (request.respondedAt) {
    return NextResponse.json({ error: "You've already submitted feedback for this trip — thank you!" }, { status: 409 });
  }

  let body: { score?: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    return NextResponse.json({ error: "Score must be a whole number between 0 and 10." }, { status: 400 });
  }
  const comment = (body.comment ?? "").trim().slice(0, 1000) || null;

  const settings = await getReviewSettingsServer();
  const category = classifyNpsScore(score, settings);
  const now = FieldValue.serverTimestamp();

  let ticketId: string | null = null;
  if (category === "detractor") {
    const refNumber = await nextRefNumberAdmin("TICKET");
    const ticketRef = await db.collection(FIRESTORE_COLLECTIONS.TICKETS).add({
      refNumber,
      title:       `Service recovery — ${request.bookingRefNumber}`,
      description: `Customer ${request.customerName} scored this trip ${score}/10.${comment ? ` Comment: "${comment}"` : " No comment left."}`,
      category:    "Service Recovery",
      priority:    "high",
      ticketStatus: "open",
      reportedById:   "system",
      reportedByName: "NPS Detractor Alert",
      assignedToId:   request.assignedTo,
      assignedToName: request.agentName,
      officeId:    request.officeId,
      resolutionNotes: null,
      resolvedAt:      null,
      sourceType:      "nps_detractor",
      linkedBookingId: request.bookingId,
      createdAt: now, updatedAt: now,
      createdBy: "review-engine",
      status:    "active",
    });
    ticketId = ticketRef.id;
  }

  const responseRef = await db.collection(FIRESTORE_COLLECTIONS.NPS_RESPONSES).add({
    reviewRequestId: request.id,
    bookingId:       request.bookingId,
    customerId:      request.customerId,
    customerName:    request.customerName,
    score, comment, category,
    destination: request.destination,
    agentName:   request.agentName,
    officeId:    request.officeId,
    officeName:  request.officeName,
    ticketId,
    createdAt: now, updatedAt: now,
    createdBy: "review-engine",
    status:    "active",
  });

  await db.collection(FIRESTORE_COLLECTIONS.REVIEW_REQUESTS).doc(request.id).update({
    respondedAt: FieldValue.serverTimestamp(),
    updatedAt:   FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    ok: true,
    id: responseRef.id,
    category,
    googleReviewUrl: category === "promoter" ? settings.googleReviewUrl : null,
  });
}
