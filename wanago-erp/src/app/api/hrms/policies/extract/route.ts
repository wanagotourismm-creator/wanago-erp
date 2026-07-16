import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireAuth } from "@/lib/firebase/admin";
import { generateMultimodal, AiGenerationError } from "@/modules/ai-core/services/geminiService";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60; // a multi-page PDF read can take longer than the default

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

const MAX_PDF_BYTES = 15 * 1024 * 1024; // generous for a policy document, guards against something unexpected

function buildSystemPrompt(companyName: string): string {
  return [
    `You are extracting the full text content of an HR policy document for ${companyName}, so it can ground an internal HR assistant's answers.`,
    "Transcribe the document's actual text content as accurately and completely as possible — every policy, number, and rule stated in it. Preserve section headings.",
    "Do not summarize, shorten, or add commentary. Do not add anything not in the document. If a page is a cover page or blank, skip it.",
    "Plain text output, no markdown formatting.",
  ].join("\n");
}

// Triggered once by hr-policy.service.ts right after upload — not on every
// Ask HR question, which is what keeps this affordable (one extraction per
// document, ever, not per query).
export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  let body: { documentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.documentId) return NextResponse.json({ error: "Missing documentId" }, { status: 400 });

  const docRef = db.collection(FIRESTORE_COLLECTIONS.HR_POLICY_DOCUMENTS).doc(body.documentId);
  const snap = await docRef.get();
  if (!snap.exists) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  const fileUrl = snap.data()?.fileUrl as string | undefined;
  if (!fileUrl) return NextResponse.json({ error: "Document has no file" }, { status: 400 });

  try {
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) throw new Error("Couldn't fetch the uploaded file");
    const contentLength = Number(fileRes.headers.get("content-length") ?? "0");
    if (contentLength > MAX_PDF_BYTES) throw new Error("File is too large to process");
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    if (buffer.byteLength > MAX_PDF_BYTES) throw new Error("File is too large to process");

    const company = await getCompanySettingsServer();
    const text = await generateMultimodal({
      feature: "hr-policy-extraction",
      system: buildSystemPrompt(company.businessName),
      prompt: "Extract the full text of this document.",
      images: [{ mimeType: "application/pdf", base64Data: buffer.toString("base64") }],
      createdBy: caller.uid,
      maxOutputTokens: 6000,
    });

    await docRef.update({ extractedText: text, extractionError: null, updatedAt: new Date() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof AiGenerationError || err instanceof Error ? err.message : "Extraction failed";
    await docRef.update({ extractionError: message, updatedAt: new Date() });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
