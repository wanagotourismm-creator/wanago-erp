import { NextRequest, NextResponse } from "next/server";
import { generateStructured, AiGenerationError } from "@/modules/ai-core/services/geminiService";
import { reviewDraftSchema, reviewDraftResponseSchema } from "@/modules/performance/reviews/schemas/ai-draft.schema";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";

export const runtime = "nodejs";

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

function buildSystemPrompt(companyName: string): string {
  return [
    `You are helping a manager at ${companyName} polish their rough performance review notes into clear, professional, specific language.`,
    "You will be given the manager's own rough/short notes for strengths, areas for improvement, and additional comments (some may be empty).",
    "Rewrite ONLY what's given into 2-3 well-formed sentences each — fix grammar, make it specific and professional in tone.",
    "CRITICAL: Do NOT invent, add, or assume any achievement, metric, or specific detail that isn't already present in the manager's notes. If a field is empty or missing, return an empty string for that field — do not fabricate content for it.",
    "Respond only with the requested JSON — no commentary.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let body: {
    employeeName?: string; rating?: string;
    strengths?: string; areasForImprovement?: string; comments?: string;
    createdBy?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const strengths = (body.strengths ?? "").trim().slice(0, 1000);
  const areasForImprovement = (body.areasForImprovement ?? "").trim().slice(0, 1000);
  const comments = (body.comments ?? "").trim().slice(0, 1000);

  if (!strengths && !areasForImprovement && !comments) {
    return NextResponse.json({ error: "Add some rough notes to at least one field first." }, { status: 400 });
  }

  const employeeName = (body.employeeName ?? "").trim().slice(0, 200);
  const rating = (body.rating ?? "").trim().slice(0, 50);
  const createdBy = String(body.createdBy ?? "unknown").slice(0, 128);

  const prompt = [
    employeeName ? `Employee: ${employeeName}` : null,
    rating ? `Overall rating: ${rating}` : null,
    `Strengths (rough notes): ${strengths || "(none provided)"}`,
    `Areas for improvement (rough notes): ${areasForImprovement || "(none provided)"}`,
    `Additional comments (rough notes): ${comments || "(none provided)"}`,
  ].filter(Boolean).join("\n");

  try {
    const company = await getCompanySettingsServer();
    const draft = await generateStructured({
      feature: "review-draft",
      system: buildSystemPrompt(company.businessName),
      prompt,
      schema: reviewDraftSchema,
      responseSchema: reviewDraftResponseSchema,
      createdBy,
      maxOutputTokens: 500,
    });
    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: "Couldn't polish these notes right now. Please try again or edit manually." }, { status: 502 });
    }
    throw err;
  }
}
