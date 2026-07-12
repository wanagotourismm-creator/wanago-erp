import { NextRequest, NextResponse } from "next/server";
import { generateText, AiGenerationError } from "@/modules/ai-core/services/geminiService";

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
    "You are drafting a short WhatsApp caption for Wanago Tours & Travels' referral program.",
    "A referrer is about to share a travel poster with friends/family, inviting them to book through Wanago.",
    "Write 2-3 warm, casual sentences (like a real person forwarding a poster, not an ad) that mention the destination if given, and end by inviting the reader to reach out.",
    "Do NOT include a link or referral code — that gets appended separately after your text.",
    "Respond with ONLY the caption text — no quotes, no preamble.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let body: { title?: string; destination?: string; createdBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const title = (body.title ?? "").trim().slice(0, 200);
  const destination = (body.destination ?? "").trim().slice(0, 200);
  const createdBy = String(body.createdBy ?? "unknown").slice(0, 128);

  const prompt = [title ? `Poster: ${title}` : null, destination ? `Destination: ${destination}` : null]
    .filter(Boolean).join("\n") || "A general travel poster, no specific destination.";

  try {
    const { text } = await generateText({
      feature: "referral-caption-draft",
      system: buildSystemPrompt(),
      prompt,
      createdBy,
      maxOutputTokens: 200,
    });
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: "Couldn't draft a caption right now — you can still share with the default text." }, { status: 502 });
    }
    throw err;
  }
}
