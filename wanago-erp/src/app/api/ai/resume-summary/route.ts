import { NextRequest, NextResponse } from "next/server";
import { generateMultimodal, AiGenerationError } from "@/modules/ai-core/services/geminiService";

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

const SYSTEM_PROMPT = [
  "You are summarizing a job candidate's resume for a recruiter at Wanago Tours & Travels, to help them scan applications faster.",
  "Summarize ONLY job-relevant qualifications: work experience (roles, duration, employers), skills, education, and certifications relevant to employability.",
  "Do NOT comment on, infer, or mention the candidate's name, age, gender, ethnicity, marital status, photo, address, or any other personal characteristic not relevant to job qualifications — extract facts about their work history and skills only.",
  "Keep it to 4-6 sentences. Plain text, no markdown.",
].join("\n");

const MAX_RESUME_BYTES = 8 * 1024 * 1024; // 8MB — comfortably above any real resume, guards against fetching something unexpected

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let body: { resumeUrl?: string; createdBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const resumeUrl = body.resumeUrl ?? "";
  // Only ever fetch resumes from our own Firebase Storage bucket — this
  // route must not become an open URL-fetching proxy for arbitrary input.
  const allowedHost = "firebasestorage.googleapis.com";
  let parsed: URL;
  try {
    parsed = new URL(resumeUrl);
  } catch {
    return NextResponse.json({ error: "No resume on file for this candidate." }, { status: 400 });
  }
  if (parsed.hostname !== allowedHost) {
    return NextResponse.json({ error: "No resume on file for this candidate." }, { status: 400 });
  }

  const createdBy = String(body.createdBy ?? "unknown").slice(0, 128);

  try {
    const fileRes = await fetch(resumeUrl);
    if (!fileRes.ok) {
      return NextResponse.json({ error: "Couldn't fetch the resume file." }, { status: 502 });
    }
    const contentLength = Number(fileRes.headers.get("content-length") ?? "0");
    if (contentLength > MAX_RESUME_BYTES) {
      return NextResponse.json({ error: "Resume file is too large to summarize." }, { status: 400 });
    }
    const mimeType = fileRes.headers.get("content-type") ?? "application/pdf";
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    if (buffer.byteLength > MAX_RESUME_BYTES) {
      return NextResponse.json({ error: "Resume file is too large to summarize." }, { status: 400 });
    }
    const base64Data = buffer.toString("base64");

    const text = await generateMultimodal({
      feature: "resume-summary",
      system: SYSTEM_PROMPT,
      prompt: "Summarize this resume.",
      images: [{ mimeType, base64Data }],
      createdBy,
      maxOutputTokens: 400,
    });
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof AiGenerationError) {
      return NextResponse.json({ error: "Couldn't summarize this resume right now." }, { status: 502 });
    }
    throw err;
  }
}
