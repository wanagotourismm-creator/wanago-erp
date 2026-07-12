import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, requireAdmin } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const DOC_PATH = ["integrationSecrets", "keys"] as const;

// True secrets — never sent back to the client once saved, only whether
// each is configured (the UI shows them masked/write-only).
const SECRET_FIELDS = [
  "anthropicApiKey", "openaiApiKey", "resendApiKey",
  "gmailAppPassword", "googleTtsApiKey",
  "metaWhatsappAccessToken", "metaWhatsappAppSecret", "metaWhatsappVerifyToken",
] as const;
// Plain identifiers, not secrets (an email "from" address / a phone number
// ID) — safe to send back so the admin can actually see and edit what's
// configured instead of it always looking blank.
const PLAIN_FIELDS = ["resendFromEmail", "gmailUser", "metaWhatsappPhoneNumberId"] as const;

const FIELDS = [...SECRET_FIELDS, ...PLAIN_FIELDS] as const;

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(bearerToken(req));
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });

  const snap = await db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).get();
  const data = snap.data() ?? {};
  const configured: Record<string, boolean> = {};
  for (const f of FIELDS) configured[f] = typeof data[f] === "string" && data[f].length > 0;

  const values: Record<string, string> = {};
  for (const f of PLAIN_FIELDS) if (configured[f]) values[f] = data[f];

  return NextResponse.json({ configured, values });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(bearerToken(req));
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });

  let body: { values?: Record<string, unknown>; clear?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Blank/omitted fields mean "leave unchanged" (this is a write-only form
  // for secrets — there's no way to distinguish "no new value typed" from
  // "clear the existing one"). Plain fields are round-tripped though, so
  // the client can tell those two cases apart and explicitly ask to clear
  // via `clear`, which actually removes the field rather than skipping it.
  const patch: Record<string, FieldValue | string> = {};
  for (const f of FIELDS) {
    const v = body.values?.[f];
    if (typeof v === "string" && v.trim().length > 0) patch[f] = v.trim();
  }
  for (const f of body.clear ?? []) {
    if ((FIELDS as readonly string[]).includes(f)) patch[f] = FieldValue.delete();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, updated: [] });
  }

  await db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).set(patch, { merge: true });
  return NextResponse.json({ ok: true, updated: Object.keys(patch) });
}
