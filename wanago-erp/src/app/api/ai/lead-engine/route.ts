import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/admin";
import { generateStructured, AiGenerationError } from "@/modules/ai-core/services/geminiService";
import { leadEngineSchema, leadEngineResponseSchema } from "@/modules/leads/schemas/lead-engine.schema";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";

export const runtime = "nodejs";

// This is an internal, login-required sales tool (drafts a customer-facing
// message an agent will send as-is or lightly edit) — matches
// whatsapp-assist/route.ts's reasoning for requiring real auth rather than
// call-next-steps/quote-draft's IP-only gate (those don't produce anything
// customer-facing, this does).
const requestLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (requestLog.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  requestLog.set(key, hits);
  return hits.length > RATE_LIMIT_MAX;
}

function bearerToken(req: NextRequest): string | null {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
}

type RecentCallLog = { outcome: string; notes: string | null; daysAgo: number };

function buildSystemPrompt(companyName: string): string {
  return [
    `You are a sales coaching assistant for a travel agency (${companyName}), helping an agent close a lead.`,
    "Given the lead's trip details, pipeline stage, quotation status, a computed closability assessment, and recent call history, respond with two things:",
    "1. `nextAction` — one concrete, specific action the agent should take today (not generic advice like \"follow up soon\" — say what to do and why, in one sentence).",
    "2. `pitch` — a short, warm, ready-to-send WhatsApp message (2-4 sentences, first-person from the agent, addressing the customer by first name) that nudges them toward closing. Reference their actual destination/trip details, and directly address any hesitation the call notes reveal, if any.",
    "Keep the pitch conversational, not salesy or pushy — a real human will send this as-is or lightly edit it.",
    "Respond only with the requested JSON — no commentary.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (isRateLimited(caller.uid)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let body: {
    leadName?: string; destination?: string; tripType?: string | null;
    pax?: number | null; budget?: number | null; travelDate?: string | null;
    stage?: string; priority?: string; quotationStatus?: string | null;
    recentCallLogs?: RecentCallLog[];
    score?: number; band?: string; reasons?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const leadName = (body.leadName ?? "").trim().slice(0, 200);
  const destination = (body.destination ?? "").trim().slice(0, 200);
  if (!leadName || !destination) {
    return NextResponse.json({ error: "Missing lead details." }, { status: 400 });
  }

  const callLogLines = (body.recentCallLogs ?? []).slice(0, 3).map((c) => {
    const notes = (c.notes ?? "").trim().slice(0, 500);
    return `- ${c.daysAgo}d ago, outcome: ${c.outcome}${notes ? ` — "${notes}"` : ""}`;
  });

  const prompt = [
    `Lead: ${leadName}`,
    `Destination: ${destination}`,
    body.tripType ? `Trip type: ${body.tripType}` : null,
    body.pax ? `Pax: ${body.pax}` : null,
    body.budget ? `Budget: ₹${body.budget}` : null,
    body.travelDate ? `Travel date: ${body.travelDate}` : null,
    `Pipeline stage: ${body.stage ?? "unknown"}`,
    `Agent's priority tag: ${body.priority ?? "unknown"}`,
    `Quotation status: ${body.quotationStatus ?? "no quotation yet"}`,
    `Closability assessment: ${body.band ?? "unknown"} (${body.score ?? "?"}/100) — ${(body.reasons ?? []).join("; ")}`,
    callLogLines.length > 0 ? `Recent call history:\n${callLogLines.join("\n")}` : "No calls logged yet.",
  ].filter(Boolean).join("\n");

  try {
    const company = await getCompanySettingsServer();
    const draft = await generateStructured({
      feature: "lead-engine",
      system: buildSystemPrompt(company.businessName),
      prompt,
      schema: leadEngineSchema,
      responseSchema: leadEngineResponseSchema,
      createdBy: caller.uid,
      maxOutputTokens: 400,
    });
    return NextResponse.json(draft);
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: "Couldn't generate a recommendation right now. Please try again shortly." }, { status: 502 });
    }
    throw err;
  }
}
