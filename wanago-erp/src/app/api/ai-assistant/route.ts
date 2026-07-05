import { NextRequest, NextResponse } from "next/server";
import { getAIAnswer, type ChatTurn, type ArticleContext } from "@/lib/ai/getAIAnswer";

export const runtime = "nodejs";

const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_ARTICLE_LENGTH = 4000;
const MAX_ARTICLES = 3;

// Same defensive pattern as /api/hr-chat — this route has no server-side
// session infra (everything else talks to Firestore directly from the
// client), so the only real risk here is API-cost abuse of a public
// endpoint, which this rate limiter blunts.
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

  let body: { question?: string; history?: ChatTurn[]; articles?: ArticleContext[] };
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

  const articles = (body.articles ?? [])
    .slice(0, MAX_ARTICLES)
    .map((a) => ({
      title: String(a.title ?? "").slice(0, 200),
      content: String(a.content ?? "").slice(0, MAX_ARTICLE_LENGTH),
    }));

  if (articles.length === 0) {
    return NextResponse.json({ source: "kb-only" });
  }

  const result = await getAIAnswer(question, articles, history);
  return NextResponse.json(result);
}
