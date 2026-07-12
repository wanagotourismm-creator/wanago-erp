import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS, REF_FORMATS } from "@/lib/constants";

export const runtime = "nodejs";

// No auth of any kind — mirrors /api/public/booking-link/[token]'s security
// model: the referral `code` is the entire boundary, and this route only
// ever reads/writes exactly the fields this feature needs. Unlike a
// booking-link token (long random, effectively unguessable), a referral
// code is short and human-shareable by design, so this route is rate
// limited against being used to enumerate/probe codes or spam-create leads.
const requestLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (requestLog.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  requestLog.set(key, hits);
  return hits.length > RATE_LIMIT_MAX;
}

async function resolveCode(code: string) {
  const db = getAdminDb();
  if (!db) return null;
  const trimmed = code.trim().toUpperCase();

  const customerSnap = await db.collection(FIRESTORE_COLLECTIONS.CUSTOMERS)
    .where("referralCode", "==", trimmed).limit(1).get();
  if (!customerSnap.empty) {
    const d = customerSnap.docs[0];
    return { type: "customer" as const, id: d.id, name: (d.data().fullName as string) ?? "a friend" };
  }

  const partnerSnap = await db.collection(FIRESTORE_COLLECTIONS.REFERRAL_PARTNERS)
    .where("referralCode", "==", trimmed).limit(1).get();
  if (!partnerSnap.empty) {
    const d = partnerSnap.docs[0];
    return { type: "partner" as const, id: d.id, name: (d.data().fullName as string) ?? "a friend" };
  }

  return null;
}

// Mirrors nextRefNumber() (lib/firebase/ref-counter.ts) but against the
// Admin SDK's transaction API instead of the client SDK's — no client-side
// equivalent is usable from a server route with no signed-in user.
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const settingsSnap = await db.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc("referralProgram").get();
  const enabled = settingsSnap.exists ? !!settingsSnap.data()?.enabled : false;
  if (!enabled) return NextResponse.json({ error: "This link isn't active right now" }, { status: 404 });

  const referrer = await resolveCode(code);
  if (!referrer) return NextResponse.json({ error: "This link isn't valid" }, { status: 404 });

  return NextResponse.json({ referrerName: referrer.name });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  const { code } = await params;
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const referrer = await resolveCode(code);
  if (!referrer) return NextResponse.json({ error: "This link isn't valid" }, { status: 404 });

  let body: { name?: string; phone?: string; email?: string; destination?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 200);
  const phone = (body.phone ?? "").trim().slice(0, 20);
  const destination = (body.destination ?? "").trim().slice(0, 200) || "Not specified yet";
  if (name.length < 2 || phone.length < 10) {
    return NextResponse.json({ error: "Please enter a valid name and phone number." }, { status: 400 });
  }

  const refNumber = await nextRefNumberAdmin("LEAD");
  const now = FieldValue.serverTimestamp();

  await db.collection(FIRESTORE_COLLECTIONS.LEADS).add({
    name, phone,
    email: (body.email ?? "").trim().slice(0, 200) || null,
    alternatePhone: null,
    destination,
    tripType: null, travelDate: null, returnDate: null, duration: null, pax: null, budget: null,
    stage: "new",
    priority: "warm",
    source: "Referral",
    assignedTo: null, agentName: null,
    matchedCustomerId: null,
    referredByCustomerId: referrer.type === "customer" ? referrer.id : null,
    referredByPartnerId:  referrer.type === "partner"  ? referrer.id : null,
    bookingLinkToken: null,
    officeId: "main", officeName: "Head Office",
    notes: (body.notes ?? "").trim().slice(0, 1000) || null,
    lastContactedAt: null,
    refNumber,
    createdAt: now, updatedAt: now,
    createdBy: "referral-link",
    status: "active",
  });

  await db.collection(FIRESTORE_COLLECTIONS.ACTIVITIES).add({
    entityType: "Lead",
    entityName: name,
    action: "created",
    detail: `New lead via referral link from ${referrer.name}`,
    actorId: "referral-link",
    actorName: referrer.name,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
