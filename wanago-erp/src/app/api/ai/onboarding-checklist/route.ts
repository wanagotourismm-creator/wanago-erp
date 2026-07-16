import { NextRequest, NextResponse } from "next/server";
import { generateStructured, AiGenerationError } from "@/modules/ai-core/services/geminiService";
import { onboardingChecklistDraftSchema, onboardingChecklistResponseSchema } from "@/modules/onboarding/schemas/ai-draft.schema";
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
    `You are drafting a new-hire onboarding checklist for ${companyName}, a travel agency.`,
    "Given a job title/department, suggest 8-14 onboarding tasks spread across these four stages: documentation, it_setup, orientation, complete.",
    "documentation: paperwork/ID/bank details/offer letter. it_setup: email, systems access, equipment. orientation: introductions, policy walkthroughs, role-specific training. complete: final sign-offs.",
    "Keep each task label short and concrete (e.g. \"Submit signed offer letter\", \"Set up company email account\", \"Shadow a senior agent on customer calls\").",
    "Respond only with the requested JSON — no commentary.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let body: { role?: string; department?: string; createdBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const role = (body.role ?? "").trim().slice(0, 200);
  if (!role) {
    return NextResponse.json({ error: "A job title/role is required." }, { status: 400 });
  }
  const department = (body.department ?? "").trim().slice(0, 100);
  const createdBy = String(body.createdBy ?? "unknown").slice(0, 128);

  const prompt = [`Role: ${role}`, department ? `Department: ${department}` : null].filter(Boolean).join("\n");

  try {
    const company = await getCompanySettingsServer();
    const draft = await generateStructured({
      feature: "onboarding-checklist-draft",
      system: buildSystemPrompt(company.businessName),
      prompt,
      schema: onboardingChecklistDraftSchema,
      responseSchema: onboardingChecklistResponseSchema,
      createdBy,
      maxOutputTokens: 800,
    });
    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: "Couldn't generate a checklist right now. Please try again or add tasks manually." }, { status: 502 });
    }
    throw err;
  }
}
