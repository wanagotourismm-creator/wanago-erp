import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { getIntegrationSecret } from "@/lib/get-integration-secret";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

type Language = "en" | "ml";
const LANGUAGE_CODES: Record<Language, string> = { en: "en-IN", ml: "ml-IN" };

// Generates (or returns already-cached) voiceover audio for one training
// step in one language. The step's own explanation text is looked up
// server-side from `stepId` — callers can't submit arbitrary text — so the
// only real generation cost is the first play of each step+language
// combination; every play after that is a free Storage read.
export async function POST(req: NextRequest) {
  let payload: { stepId?: string; language?: Language };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { stepId, language } = payload;
  if (!stepId || (language !== "en" && language !== "ml")) {
    return NextResponse.json({ error: "Missing stepId/language" }, { status: 400 });
  }

  const apiKey = await getIntegrationSecret("googleTtsApiKey", "GOOGLE_TTS_API_KEY");
  if (!apiKey) {
    return NextResponse.json({ error: "Voiceover isn't set up yet — add a Google Cloud TTS API key in Admin → Integrations." }, { status: 501 });
  }

  const db = getAdminDb();
  const bucket = getAdminStorage();
  if (!db || !bucket) {
    return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });
  }

  const stepRef = db.collection(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_STEPS).doc(stepId);
  const stepSnap = await stepRef.get();
  if (!stepSnap.exists) {
    return NextResponse.json({ error: "Training step not found" }, { status: 404 });
  }
  const step = stepSnap.data() as { explanationEn: string; explanationMl: string; audioUrlEn?: string | null; audioUrlMl?: string | null };

  const cachedUrl = language === "en" ? step.audioUrlEn : step.audioUrlMl;
  if (cachedUrl) {
    return NextResponse.json({ url: cachedUrl });
  }

  const text = language === "en" ? step.explanationEn : step.explanationMl;
  if (!text?.trim()) {
    return NextResponse.json({ error: "This step has no explanation text to read yet" }, { status: 400 });
  }

  const ttsRes = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input: { text },
      // No specific voice name pinned — Google picks a default voice for
      // the language/gender combo, so this keeps working as their voice
      // catalog changes over time instead of breaking on a renamed voice.
      voice: { languageCode: LANGUAGE_CODES[language], ssmlGender: "NEUTRAL" },
      audioConfig: { audioEncoding: "MP3" },
    }),
  });

  if (!ttsRes.ok) {
    const errText = await ttsRes.text();
    return NextResponse.json({ error: `Voiceover generation failed: ${errText}` }, { status: 502 });
  }

  const { audioContent } = (await ttsRes.json()) as { audioContent?: string };
  if (!audioContent) {
    return NextResponse.json({ error: "Voiceover generation returned no audio" }, { status: 502 });
  }

  const buffer = Buffer.from(audioContent, "base64");
  const filePath = `training-audio/${stepId}/${language}.mp3`;
  const file = bucket.file(filePath);
  await file.save(buffer, { contentType: "audio/mpeg" });
  await file.makePublic();
  const url = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

  await stepRef.update(language === "en" ? { audioUrlEn: url } : { audioUrlMl: url });

  return NextResponse.json({ url });
}
