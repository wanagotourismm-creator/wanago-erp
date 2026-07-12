import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/admin";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export const runtime = "nodejs";

const BUCKET = "app-uploads";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Temporary bridge: Firebase Storage can't be used until the project's
// Blaze plan is activated (Cloud Storage for Firebase requires it, and the
// bucket was never provisioned), so every browser-side file upload in the
// app is routed through this route to Supabase Storage's free tier
// instead, via the existing server-only Supabase connection (see
// lib/supabase/client.ts — there's no browser-facing Supabase client by
// design, so uploads go through this proxy rather than a public anon key).
export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

  const form = await req.formData();
  const path = form.get("path");
  const file = form.get("file");
  if (typeof path !== "string" || !path || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing path or file" }, { status: 400 });
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) {
    console.error(`[api/storage/upload] upload failed for "${path}":`, error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
