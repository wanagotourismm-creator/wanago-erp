import { NextRequest, NextResponse } from "next/server";
import { generateText, AiGenerationError } from "@/modules/ai-core/services/geminiService";

export const runtime = "nodejs";

// Same defensive pattern as the other public AI routes — no server-side
// session infra, IP rate limiting is the only guard against cost abuse.
const requestLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (requestLog.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  requestLog.set(key, hits);
  return hits.length > RATE_LIMIT_MAX;
}

type ThreadMessage = { direction: "inbound" | "outbound"; body: string };
type Mode = "suggest-reply" | "summarize" | "translate";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 1000;

function formatThread(messages: ThreadMessage[], customerName: string | null): string {
  return messages
    .map((m) => `${m.direction === "inbound" ? (customerName ?? "Customer") : "Wanago Staff"}: ${m.body}`)
    .join("\n");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let body: {
    mode?: Mode;
    messages?: ThreadMessage[];
    customerName?: string | null;
    text?: string;
    targetLanguage?: "en" | "ml";
    createdBy?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const createdBy = String(body.createdBy ?? "unknown").slice(0, 128);
  const mode = body.mode;

  try {
    if (mode === "suggest-reply" || mode === "summarize") {
      const messages = (body.messages ?? [])
        .slice(-MAX_MESSAGES)
        .filter((m) => (m.direction === "inbound" || m.direction === "outbound") && typeof m.body === "string")
        .map((m) => ({ direction: m.direction, body: m.body.slice(0, MAX_MESSAGE_LENGTH) }));

      if (messages.length === 0) {
        return NextResponse.json({ error: "No conversation to work from yet." }, { status: 400 });
      }

      const customerName = body.customerName ?? null;
      const thread = formatThread(messages, customerName);

      const system = mode === "suggest-reply"
        ? [
            "You are a customer service agent for Wanago Tours & Travels, replying to a customer over WhatsApp.",
            "Given the conversation so far, draft ONE short, warm, helpful reply the human agent can review and edit before sending — not a menu of options.",
            "Match the customer's language (English or Malayalam) and tone. Keep it concise, like a real WhatsApp message, not an email.",
            "Respond with ONLY the reply text — no quotes, no preamble, no explanation.",
          ].join("\n")
        : [
            "Summarize this WhatsApp conversation between a Wanago Tours & Travels agent and a customer, in 2-3 short sentences a colleague can read to instantly catch up.",
            "Focus on what the customer wants, what's been agreed/promised, and what's still pending. Plain text, no markdown.",
          ].join("\n");

      const { text } = await generateText({
        feature: mode === "suggest-reply" ? "whatsapp-suggest-reply" : "whatsapp-summarize",
        system,
        prompt: thread,
        createdBy,
        maxOutputTokens: mode === "suggest-reply" ? 300 : 200,
      });
      return NextResponse.json({ text });
    }

    if (mode === "translate") {
      const text = (body.text ?? "").trim().slice(0, 2000);
      if (!text) return NextResponse.json({ error: "Nothing to translate." }, { status: 400 });
      const targetLanguage = body.targetLanguage === "en" ? "English" : "Malayalam";

      const { text: translated } = await generateText({
        feature: "whatsapp-translate",
        system: `Translate the given WhatsApp message into ${targetLanguage}. Respond with ONLY the translated text, no explanation, keeping the same tone and any emoji.`,
        prompt: text,
        createdBy,
        maxOutputTokens: 500,
      });
      return NextResponse.json({ text: translated });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: "AI assist isn't available right now. Please try again shortly." }, { status: 502 });
    }
    throw err;
  }
}
