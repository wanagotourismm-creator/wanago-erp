import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { phoneMatchKey } from "@/lib/utils/helpers";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// lead.service.ts's findMatchingCustomer() used to search customers via the
// client SDK (fetchCustomers()), which firestore.rules scopes to only the
// caller's own + unassigned customers for a plain sales/marketing role —
// silently missing a real match owned by a different agent, so converting
// a lead created a duplicate Customer record instead of reusing the
// existing one. This route searches the full collection via the Admin SDK
// (bypassing that visibility scoping) purely to answer "does a customer
// with this phone number already exist anywhere" — it doesn't expose the
// broader collection browsing that scoping is meant to prevent.
export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const adminDb = getAdminDb();
  if (!adminDb) return NextResponse.json({ customer: null });

  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const key = phoneMatchKey(body.phone);
  if (!key) return NextResponse.json({ customer: null });

  const snap = await adminDb.collection(FIRESTORE_COLLECTIONS.CUSTOMERS).get();
  const match = snap.docs.find((d) => phoneMatchKey(d.data().phone) === key);
  if (!match) return NextResponse.json({ customer: null });

  return NextResponse.json({ customer: { id: match.id, ...match.data() } });
}
