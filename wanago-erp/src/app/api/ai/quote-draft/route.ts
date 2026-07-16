import { NextRequest, NextResponse } from "next/server";
import { generateStructured, AiGenerationError } from "@/modules/ai-core/services/geminiService";
import { quoteDraftSchema, quoteDraftResponseSchema } from "@/modules/quotations/schemas/ai-draft.schema";
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
    `You are drafting line items for a travel quotation from ${companyName}.`,
    "Given a destination, number of pax, and (optionally) a package name, suggest the typical line items a quote for this trip would include (e.g. \"Return flights\", \"4-night hotel stay\", \"Airport transfers\", \"Daily breakfast\", \"Local sightseeing tours\").",
    "Suggest 4-8 line items, specific to the destination where possible (e.g. named activities/transfers typical for that place), but DO NOT invent prices — only descriptions. The agent fills in real amounts separately.",
    "Respond only with the requested JSON — no commentary.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let body: { destination?: string; pax?: number; packageName?: string; createdBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const destination = (body.destination ?? "").trim().slice(0, 200);
  if (!destination) {
    return NextResponse.json({ error: "A destination is required." }, { status: 400 });
  }

  const pax = Number(body.pax) || 1;
  const packageName = (body.packageName ?? "").trim().slice(0, 200);
  const createdBy = String(body.createdBy ?? "unknown").slice(0, 128);

  const prompt = [
    `Destination: ${destination}`,
    `Pax: ${pax}`,
    packageName ? `Package: ${packageName}` : null,
  ].filter(Boolean).join("\n");

  try {
    const company = await getCompanySettingsServer();
    const draft = await generateStructured({
      feature: "quote-draft",
      system: buildSystemPrompt(company.businessName),
      prompt,
      schema: quoteDraftSchema,
      responseSchema: quoteDraftResponseSchema,
      createdBy,
      maxOutputTokens: 500,
    });
    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: "Couldn't generate suggestions right now. Please try again or fill it in manually." }, { status: 502 });
    }
    throw err;
  }
}
