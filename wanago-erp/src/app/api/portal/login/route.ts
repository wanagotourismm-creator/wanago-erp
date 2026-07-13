import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { phoneMatchKey } from "@/lib/utils/helpers";

export const runtime = "nodejs";

// No Firebase Auth account exists for customers/partners ahead of time —
// this route IS the account creation + login step in one. Credential is
// phone number + the referral code they already have (every Customer and
// ReferralPartner gets one automatically), so there's nothing extra to
// remember and no SMS/email OTP cost. Free-tier-friendly by design: this
// mints a Firebase custom token via the Admin SDK (self-signed from the
// service account key, no external call, no Blaze requirement) rather than
// using phone-number sign-in, which needs Blaze for SMS.
const requestLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (requestLog.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  requestLog.set(key, hits);
  return hits.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many attempts — please wait a minute and try again." }, { status: 429 });
  }

  const db = getAdminDb();
  const adminAuth = getAdminAuth();
  if (!db || !adminAuth) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  let body: { portalType?: "customer" | "partner"; phone?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { portalType } = body;
  const code = (body.code ?? "").trim().toUpperCase();
  const phoneKey = phoneMatchKey(body.phone);
  if (!portalType || !code || !phoneKey) {
    return NextResponse.json({ error: "Enter your phone number and referral code." }, { status: 400 });
  }

  const collection = portalType === "partner" ? FIRESTORE_COLLECTIONS.REFERRAL_PARTNERS : FIRESTORE_COLLECTIONS.CUSTOMERS;
  const snap = await db.collection(collection).where("referralCode", "==", code).limit(1).get();
  if (snap.empty) {
    return NextResponse.json({ error: "We couldn't find that referral code." }, { status: 404 });
  }

  const doc = snap.docs[0];
  const data = doc.data();
  const recordPhoneKey = phoneMatchKey(data.phone as string | undefined);
  if (recordPhoneKey !== phoneKey) {
    return NextResponse.json({ error: "That phone number doesn't match this referral code." }, { status: 401 });
  }

  const uid = portalType === "partner" ? `partner_${doc.id}` : `cust_${doc.id}`;
  const token = await adminAuth.createCustomToken(uid);
  const name = portalType === "partner" ? (data.fullName as string) : (data.fullName as string);

  return NextResponse.json({ token, name });
}
