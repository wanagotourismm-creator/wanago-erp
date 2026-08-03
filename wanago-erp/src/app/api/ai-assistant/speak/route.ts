import { NextRequest, NextResponse } from "next/server";
import { getIntegrationSecret } from "@/lib/get-integration-secret";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 800;
type Language = "en" | "ml";
const LANGUAGE_CODES: Record<Language, string> = { en: "en-IN", ml: "ml-IN" };

// Same rate-limit pattern as the sibling transcribe route.
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

// Real server-side voice synthesis for the AI Assistant's "speak aloud"
// toggle — replaces relying on the browser's own speechSynthesis, which on
// most setups has no Malayalam voice installed at all and silently does
// nothing (see AIAssistantPanel.tsx's prior findVoice() comment). Reuses
// the exact same Google Cloud TTS call already proven in
// src/app/api/onboarding-training/tts/route.ts, just without that route's
// Supabase caching layer — every AI reply is unique text, so there's
// nothing to cache/reuse across requests the way a fixed training step's
// narration is.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let payload: { text?: string; language?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const text = (payload.text ?? "").trim().slice(0, MAX_TEXT_LENGTH);
  const language: Language = payload.language === "ml" ? "ml" : "en";
  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const apiKey = await getIntegrationSecret("googleTtsApiKey", "GOOGLE_TTS_API_KEY");
  if (!apiKey) {
    return NextResponse.json({ error: "Voice replies aren't set up yet — add a Google Cloud TTS API key in Admin → Integrations." }, { status: 501 });
  }

  try {
    const ttsRes = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: LANGUAGE_CODES[language], ssmlGender: "NEUTRAL" },
        audioConfig: { audioEncoding: "MP3" },
      }),
    });

    if (!ttsRes.ok) {
      return NextResponse.json({ error: "Voice generation failed." }, { status: 502 });
    }

    const { audioContent } = (await ttsRes.json()) as { audioContent?: string };
    if (!audioContent) {
      return NextResponse.json({ error: "Voice generation returned no audio." }, { status: 502 });
    }

    return NextResponse.json({ audioBase64: audioContent });
  } catch {
    return NextResponse.json({ error: "Voice replies are temporarily unavailable." }, { status: 502 });
  }
}
