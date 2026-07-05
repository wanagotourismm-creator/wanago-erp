import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireAdmin } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const DOC_PATH = ["integrationSecrets", "keys"] as const;
const FIELDS = [
  "anthropicApiKey", "openaiApiKey",
  "resendApiKey", "resendFromEmail",
  "twilioAccountSid", "twilioAuthToken", "twilioWhatsappNumber",
] as const;

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

  return NextResponse.json({ configured });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(bearerToken(req));
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Blank/omitted fields mean "leave unchanged" — this is a write-only form,
  // so there's no way for the client to know (or send back) the existing value.
  const patch: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = body[f];
    if (typeof v === "string" && v.trim().length > 0) patch[f] = v.trim();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, updated: [] });
  }

  await db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).set(patch, { merge: true });
  return NextResponse.json({ ok: true, updated: Object.keys(patch) });
}
