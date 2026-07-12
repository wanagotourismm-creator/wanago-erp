import { NextRequest, NextResponse } from "next/server";
import { generateText, AiGenerationError } from "@/modules/ai-core/services/geminiService";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatContext = {
  employeeName?: string;
  department?: string;
  designation?: string;
  leaveBalances?: { type: string; remaining: number; entitlement: number }[];
  upcomingHolidays?: { name: string; date: string }[];
};

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1500;

// This route has no server-side identity verification (the app has no
// server-side session infra — everything else talks to Firestore
// directly from the client). The context below is whatever the client
// already fetched under its own Firestore rules, so there's no data
// exposure risk; the only real risk is API-cost abuse of this public
// endpoint, which the rate limiter below exists to blunt.
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

function buildSystemPrompt(context: ChatContext): string {
  const lines = [
    "You are the HR assistant for Wanago Tours & Travels, embedded in the company's internal ERP under \"My HR\".",
    "You answer employee questions about leave policy, leave balances, attendance, holidays, and general HR process.",
    "Leave types and annual entitlements: Casual (12 days/year), Sick (12 days/year), Earned (15 days/year). Emergency leave and Work From Home are also available but uncapped/case-by-case. Loss of Pay is available for unpaid leave beyond other balances.",
    "Leave requests are approved by the employee's reporting manager, or by HR/Admin as a fallback.",
    "You cannot perform actions yourself (you cannot apply leave, check in/out, submit corrections, request assets, or file tickets). When an employee asks you to do one of these, tell them which button/tab on the My HR page to use instead (Apply Leave, Check In/Out, Request Correction on the Attendance calendar, Request under My Assets, Report Issue under IT Support).",
    "Be concise, warm, and specific. If you don't know something company-specific that isn't in your context below, say so plainly instead of guessing.",
  ];

  if (context.employeeName) lines.push(`\nThe employee you're talking to is ${context.employeeName}${context.designation ? `, ${context.designation}` : ""}${context.department ? ` in ${context.department}` : ""}.`);
  if (context.leaveBalances?.length) {
    lines.push("Their current leave balances: " + context.leaveBalances.map((b) => `${b.type}: ${b.remaining}/${b.entitlement} days remaining`).join(", ") + ".");
  }
  if (context.upcomingHolidays?.length) {
    lines.push("Upcoming company holidays: " + context.upcomingHolidays.map((h) => `${h.name} (${h.date})`).join(", ") + ".");
  }

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let body: { messages?: ChatMessage[]; context?: ChatContext; createdBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .slice(-MAX_MESSAGES)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));

  if (messages.length === 0) {
    return NextResponse.json({ error: "No message provided" }, { status: 400 });
  }

  const system = buildSystemPrompt(body.context ?? {});
  const history = messages.slice(0, -1);
  const prompt = messages[messages.length - 1].content;
  const createdBy = String(body.createdBy ?? "unknown").slice(0, 128);

  try {
    const { text } = await generateText({ feature: "hr-chat", system, prompt, history, createdBy, maxOutputTokens: 600 });
    return NextResponse.json({ reply: text });
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
