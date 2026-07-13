import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requirePortalAuth } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function GET(req: NextRequest) {
  const caller = await requirePortalAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const snap = await db.collection(FIRESTORE_COLLECTIONS.REFERRAL_POSTERS).where("posterStatus", "==", "active").get();
  const posters = snap.docs.map(d => {
    const p = d.data();
    return { id: d.id, title: p.title as string, imageUrl: p.imageUrl as string, captionTemplate: p.captionTemplate as string, destination: p.destination as string | null };
  });

  return NextResponse.json({ posters });
}
