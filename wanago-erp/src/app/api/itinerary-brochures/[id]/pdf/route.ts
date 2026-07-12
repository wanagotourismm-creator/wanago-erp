import { NextRequest, NextResponse } from "next/server";
import { requireOperationsOrSales, getAdminDb } from "@/lib/firebase/admin";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { renderBrochureHtml } from "@/modules/itinerary-brochures/pdf-templates";
import { launchBrowser } from "@/lib/pdf/browser";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { ItineraryBrochure } from "@/modules/itinerary-brochures/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Temporary bridge — Firebase Storage requires the Blaze plan, not active
// yet, so generated PDFs land in the same Supabase bucket every other
// upload was migrated to (see /api/storage/upload).
const STORAGE_BUCKET = "app-uploads";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://wanago-erp.vercel.app";
}

// Fetched over HTTP (not read off disk) because Next.js doesn't guarantee
// `public/` is present in the deployed serverless function's filesystem —
// the CDN-served URL is always reachable regardless of bundling, so this
// works identically in dev and on Vercel.
async function logoDataUri(): Promise<string> {
  const res = await fetch(`${appUrl()}/images/logo-white-clean.png`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireOperationsOrSales(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await params;
  const db = getAdminDb();
  const supabase = getSupabaseAdmin();
  if (!db || !supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const snap = await db.collection(FIRESTORE_COLLECTIONS.ITINERARY_BROCHURES).doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Brochure not found" }, { status: 404 });
  const brochure = { id: snap.id, ...snap.data() } as ItineraryBrochure;

  let browser;
  try {
    const html = renderBrochureHtml(brochure, await logoDataUri());

    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    // setContent's waitUntil doesn't cover the Google Fonts @import (no
    // page navigation, so there's no network-idle signal to wait for) —
    // wait on the Font Loading API directly so Playfair Display/Poppins
    // are actually painted before the PDF snapshot is taken.
    await page.evaluateHandle("document.fonts.ready");
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

    const filePath = `itinerary-brochures/${id}.pdf`;
    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, Buffer.from(pdfBuffer), {
      contentType: "application/pdf",
      upsert: true,
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    const pdfUrl = data.publicUrl;

    await db.collection(FIRESTORE_COLLECTIONS.ITINERARY_BROCHURES).doc(id).update({
      pdfUrl,
      pdfGeneratedAt: new Date(),
    });

    return NextResponse.json({ pdfUrl });
  } catch (err) {
    console.error(`[api/itinerary-brochures/${id}/pdf] generation failed:`, err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
