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

// Companion to /api/storage/upload — lists files already uploaded under a
// folder prefix (e.g. "itinerary-images") so callers can offer "pick from
// existing" instead of only "upload new". Same Supabase bridge as upload.
export async function GET(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

  const prefix = req.nextUrl.searchParams.get("prefix") ?? "";
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 200,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) {
    console.error(`[api/storage/list] list failed for "${prefix}":`, error);
    return NextResponse.json({ error: "List failed" }, { status: 500 });
  }

  const urls = (data ?? [])
    .filter((item) => item.id !== null) // folders show up with id:null; skip them
    .map((item) => supabase.storage.from(BUCKET).getPublicUrl(`${prefix}/${item.name}`).data.publicUrl);

  return NextResponse.json({ urls });
}
