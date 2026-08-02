import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/admin";
import { runAssistantTurn, type AssistantTurnResult } from "@/modules/ai-core/services/ai-assistant-orchestrator";
import { AiGenerationError } from "@/modules/ai-core/services/geminiService";
import { isAiEmployeeEnabled } from "@/modules/ai-core/services/ai-settings.server";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";
import type { ChatTurn } from "@/modules/ai-core/services/geminiService";

export const runtime = "nodejs";

const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 1000;

// The Python "AI Employee" brain (api/ai/assistant.py) has broader tool
// coverage than the original TS orchestrator, so it's tried first. On any
// failure (missing secret/URL config, network error, timeout, non-2xx) this
// silently falls back to the original TS orchestrator below rather than
// failing the whole request — a Python-side outage or misconfiguration
// should degrade to "fewer tools available," not "assistant is down."
const PYTHON_BRAIN_TIMEOUT_MS = 25_000;

function resolvePythonBrainUrl(): string | null {
  const explicit = process.env.AI_SERVICE_URL;
  if (explicit) return explicit;
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/ai/assistant`;
}

async function callPythonBrain(input: {
  question: string; history: ChatTurn[]; uid: string; role: string | null; language: "en" | "ml";
}): Promise<AssistantTurnResult | null> {
  const secret = process.env.AI_INTERNAL_SECRET;
  const url = resolvePythonBrainUrl();
  if (!secret || !url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PYTHON_BRAIN_TIMEOUT_MS);
  try {
    const company = await getCompanySettingsServer();
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({
        question: input.question, history: input.history, uid: input.uid, role: input.role,
        language: input.language, companyName: company.businessName,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.kind === "answer" && typeof data.text === "string") return { kind: "answer", text: data.text };
    if (data?.kind === "proposal" && typeof data.tool === "string") {
      return { kind: "proposal", tool: data.tool, args: data.args, summary: data.summary };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

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

  if (!(await isAiEmployeeEnabled())) {
    return NextResponse.json({ error: "The AI Assistant is currently turned off. Ask an admin to re-enable it under Admin > AI Employee." }, { status: 403 });
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

  const language: "en" | "ml" = body.language === "ml" ? "ml" : "en";

  const pythonResult = await callPythonBrain({ question, history, uid: caller.uid, role: caller.role, language });
  if (pythonResult) {
    return NextResponse.json(pythonResult);
  }

  try {
    const result = await runAssistantTurn({ question, history, createdBy: caller.uid, callerRole: caller.role, language });
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
