import { NextRequest, NextResponse } from "next/server";
import { generateText, AiGenerationError } from "@/modules/ai-core/services/geminiService";

export const runtime = "nodejs";

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

function buildSystemPrompt(): string {
  return [
    "You are drafting a short recognition/kudos message a manager at Wanago Tours & Travels can send to a team member, based ONLY on the real activity numbers given below.",
    "Write 2-3 warm, specific sentences referencing those actual numbers (revenue, bookings, leads won, conversion rate) — do not invent any deal, customer, or detail not present in the data.",
    "Avoid generic praise like 'great job' with no specifics. This is meant to feel earned and concrete, not like automated flattery.",
    "Plain text, ready to send as-is or lightly edited.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let body: {
    agentName?: string; monthLabel?: string;
    revenue?: number; bookingsConfirmed?: number; leadsWon?: number; conversionRate?: number;
    createdBy?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const agentName = (body.agentName ?? "").trim().slice(0, 200);
  if (!agentName) {
    return NextResponse.json({ error: "Missing agent." }, { status: 400 });
  }
  const createdBy = String(body.createdBy ?? "unknown").slice(0, 128);

  const prompt = [
    `Agent: ${agentName}`,
    body.monthLabel ? `Period: ${body.monthLabel}` : null,
    `Revenue: ${body.revenue ?? 0}`,
    `Bookings confirmed: ${body.bookingsConfirmed ?? 0}`,
    `Leads won: ${body.leadsWon ?? 0}`,
    `Conversion rate: ${(body.conversionRate ?? 0).toFixed(0)}%`,
  ].filter(Boolean).join("\n");

  try {
    const { text } = await generateText({
      feature: "kudos-draft",
      system: buildSystemPrompt(),
      prompt,
      createdBy,
      maxOutputTokens: 250,
    });
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: "Couldn't draft this right now. Please try again shortly." }, { status: 502 });
    }
    throw err;
  }
}
