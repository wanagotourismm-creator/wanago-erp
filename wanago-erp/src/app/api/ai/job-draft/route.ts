import { NextRequest, NextResponse } from "next/server";
import { generateStructured, AiGenerationError } from "@/modules/ai-core/services/geminiService";
import { jobDraftSchema, jobDraftResponseSchema } from "@/modules/recruitment/jobs/schemas/ai-draft.schema";

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

function buildSystemPrompt(): string {
  return [
    "You are drafting a job posting for Wanago Tours & Travels, a travel agency.",
    "Given a job title, department, location, and employment type, write:",
    "description: a 3-5 sentence role summary an applicant would read first.",
    "requirements: 4-8 bullet points (one per line, starting with \"- \"), covering typical skills/experience/qualifications for this role at a travel agency.",
    "Respond only with the requested JSON — no commentary.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let body: { title?: string; department?: string; location?: string; employmentType?: string; createdBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const title = (body.title ?? "").trim().slice(0, 200);
  if (!title) {
    return NextResponse.json({ error: "A job title is required." }, { status: 400 });
  }

  const department = (body.department ?? "").trim().slice(0, 100);
  const location = (body.location ?? "").trim().slice(0, 100);
  const employmentType = (body.employmentType ?? "").trim().slice(0, 50);
  const createdBy = String(body.createdBy ?? "unknown").slice(0, 128);

  const prompt = [
    `Title: ${title}`,
    department ? `Department: ${department}` : null,
    location ? `Location: ${location}` : null,
    employmentType ? `Employment type: ${employmentType}` : null,
  ].filter(Boolean).join("\n");

  try {
    const draft = await generateStructured({
      feature: "job-description-draft",
      system: buildSystemPrompt(),
      prompt,
      schema: jobDraftSchema,
      responseSchema: jobDraftResponseSchema,
      createdBy,
      maxOutputTokens: 500,
    });
    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: "Couldn't generate a draft right now. Please try again or fill it in manually." }, { status: 502 });
    }
    throw err;
  }
}
