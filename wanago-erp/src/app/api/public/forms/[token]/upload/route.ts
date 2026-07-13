import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

const BUCKET = "app-uploads";

// File-upload counterpart to the public form route — a public form's file
// question can't use the authenticated /api/storage/upload bridge (no
// login here), so this is its own narrow, token-gated equivalent: only
// accepts uploads for a form that's genuinely published as Public.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getAdminDb();
  const supabase = getSupabaseAdmin();
  if (!db || !supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const snap = await db.collection(FIRESTORE_COLLECTIONS.FORMS).where("shareToken", "==", token).limit(1).get();
  if (snap.empty) return NextResponse.json({ error: "This form isn't available" }, { status: 404 });
  const form = snap.docs[0].data() as { visibility: string; formStatus: string };
  if (form.visibility !== "public" || form.formStatus !== "published") {
    return NextResponse.json({ error: "This form isn't available" }, { status: 404 });
  }

  const formEntries = await req.formData();
  const file = formEntries.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const path = `forms/${snap.docs[0].id}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
