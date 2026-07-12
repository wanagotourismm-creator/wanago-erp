import { NextRequest, NextResponse } from "next/server";
import { generateStructured, AiGenerationError } from "@/modules/ai-core/services/geminiService";
import { itineraryDraftSchema, itineraryDraftResponseSchema } from "@/modules/itineraries/schemas/ai-draft.schema";

export const runtime = "nodejs";

// Same defensive pattern as /api/ai-assistant and /api/hr-chat — no
// server-side session infra, so IP-based rate limiting is the only guard
// against cost abuse of this public endpoint.
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
    "You are a travel itinerary writer for Wanago Tours & Travels, a travel agency.",
    "Given a destination, trip duration, and (optionally) trip type, draft a day-by-day itinerary a sales agent can review and edit before sending to a customer.",
    "Write specific, realistic day plans (real-sounding activities/sights for that destination), not generic placeholders like 'explore the city'.",
    "Keep each day's description to 2-3 sentences. Inclusions/exclusions should be short bullet phrases (e.g. \"Airport transfers\", \"International flights\"), 4-8 of each, typical for a package at that destination.",
    "The tagline is one short, appealing marketing sentence for this specific trip.",
    "Respond only with the requested JSON — no commentary.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let body: { destination?: string; durationDays?: number; tripType?: string; createdBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const destination = (body.destination ?? "").trim().slice(0, 200);
  const durationDays = Number(body.durationDays);
  if (!destination || !Number.isFinite(durationDays) || durationDays < 1 || durationDays > 60) {
    return NextResponse.json({ error: "A destination and a duration between 1 and 60 days are required." }, { status: 400 });
  }

  const tripType = (body.tripType ?? "").trim().slice(0, 50);
  const createdBy = String(body.createdBy ?? "unknown").slice(0, 128);

  const prompt = [
    `Destination: ${destination}`,
    `Duration: ${durationDays} day(s)`,
    tripType ? `Trip type: ${tripType}` : null,
  ].filter(Boolean).join("\n");

  try {
    const draft = await generateStructured({
      feature: "itinerary-draft",
      system: buildSystemPrompt(),
      prompt,
      schema: itineraryDraftSchema,
      responseSchema: itineraryDraftResponseSchema,
      createdBy,
      maxOutputTokens: 2000,
    });
    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: "Couldn't generate a draft right now. Please try again or fill it in manually." }, { status: 502 });
    }
    throw err;
  }
}
