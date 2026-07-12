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
    "You are a sales coaching assistant for a travel agency (Wanago Tours & Travels), helping an agent after they log a customer call.",
    "Given the call outcome and the agent's notes/summary, suggest 2-4 concrete next steps the agent should take (e.g. what to send, what to follow up on, when).",
    "If the notes mention any objection or hesitation from the customer (price, timing, comparing other agencies, etc.), include one specific, practical suggestion for how to address it.",
    "Be concise and actionable — short bullet points, no long explanations. Plain text, use \"- \" for bullets, no markdown headers.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let body: { notes?: string; outcome?: string; contactName?: string; createdBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const notes = (body.notes ?? "").trim().slice(0, 2000);
  if (!notes) {
    return NextResponse.json({ error: "Add some call notes first." }, { status: 400 });
  }

  const outcome = (body.outcome ?? "").trim().slice(0, 50);
  const contactName = (body.contactName ?? "").trim().slice(0, 200);
  const createdBy = String(body.createdBy ?? "unknown").slice(0, 128);

  const prompt = [
    contactName ? `Contact: ${contactName}` : null,
    outcome ? `Call outcome: ${outcome}` : null,
    `Notes: ${notes}`,
  ].filter(Boolean).join("\n");

  try {
    const { text } = await generateText({
      feature: "call-next-steps",
      system: buildSystemPrompt(),
      prompt,
      createdBy,
      maxOutputTokens: 300,
    });
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: "AI suggestions aren't available right now. Please try again shortly." }, { status: 502 });
    }
    throw err;
  }
}
