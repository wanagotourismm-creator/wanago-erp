import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserRole } from "@/lib/firebase/admin";
import { runAssistantTurn } from "@/modules/ai-core/services/ai-assistant-orchestrator";
import { AiGenerationError } from "@/modules/ai-core/services/geminiService";
import type { ChatTurn } from "@/modules/ai-core/services/geminiService";

export const runtime = "nodejs";

const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 1000;

// Unlike the old ai-assistant/hr-chat routes, this one can trigger AI
// write-tool proposals, so it requires a verified caller identity (see
// requireAuth in src/lib/firebase/admin.ts) rather than relying only on the
// IP rate limiter below. The limiter stays as defense-in-depth against
// cost-abuse from a compromised/shared token.
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

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const caller = await requireAuth(idToken);
  if (!caller) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: { question?: string; history?: ChatTurn[]; language?: "en" | "ml" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const question = (body.question ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!question) {
    return NextResponse.json({ error: "No question provided" }, { status: 400 });
  }

  const history = (body.history ?? [])
    .slice(-MAX_HISTORY)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));

  const callerRole = await getUserRole(caller.uid);
  const language: "en" | "ml" = body.language === "ml" ? "ml" : "en";

  try {
    const result = await runAssistantTurn({ question, history, createdBy: caller.uid, callerRole, language });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json(
        { error: "The AI assistant isn't set up yet. An admin needs to add a GEMINI_API_KEY or GROQ_API_KEY to the deployment." },
        { status: 501 }
      );
    }
    return NextResponse.json({ error: "The AI assistant is temporarily unavailable. Please try again shortly." }, { status: 502 });
  }
}
