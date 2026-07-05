import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const WHISPER_MODEL = "whisper-large-v3";
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB — generous for a short voice question

// Same rate-limit pattern as the rest of the AI assistant routes.
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

// Speech-to-text only has a Groq (Whisper) path — Gemini isn't used here,
// since this app's Gemini integration is text-only. If GROQ_API_KEY isn't
// configured, voice input simply isn't available (clear error, not a fake
// transcription).
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json({ error: "Voice input isn't configured yet — an admin needs to add a GROQ_API_KEY." }, { status: 501 });
  }

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = incoming.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Recording is too long" }, { status: 413 });
  }

  const languageRaw = incoming.get("language");
  const language = languageRaw === "ml" ? "ml" : "en";

  // The knowledge base is written in English, so Malayalam input goes
  // through Whisper's *translation* endpoint (always outputs English text)
  // rather than transcription — this keeps retrieval reliable regardless of
  // which language the employee spoke in. The reply still comes back in
  // Malayalam via the separate `language` flag sent to /api/ai-assistant.
  const endpoint = language === "ml"
    ? "https://api.groq.com/openai/v1/audio/translations"
    : "https://api.groq.com/openai/v1/audio/transcriptions";

  const forwardForm = new FormData();
  forwardForm.set("file", file, "recording.webm");
  forwardForm.set("model", WHISPER_MODEL);
  if (language === "en") forwardForm.set("language", "en");

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${groqKey}` },
      body: forwardForm,
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Transcription failed — please try again." }, { status: 502 });
    }

    const data = await res.json();
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Couldn't hear anything — please try again." }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "Transcription is temporarily unavailable." }, { status: 502 });
  }
}
