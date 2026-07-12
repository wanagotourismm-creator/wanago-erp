// Server-only — never import from client code, since this reads raw API
// keys from process.env. Every AI feature's server-side code (API routes,
// cron routes) should call through here rather than hitting Gemini/Groq
// directly, so model choice, fallback behavior, and usage logging live in
// one place. Generalizes the Gemini->Groq->fail pattern that
// src/lib/ai/getAIAnswer.ts proved out for the help assistant.
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { logAiUsage } from "@/modules/ai-core/services/ai-usage-log.service";
import { DEFAULT_AI_SETTINGS } from "@/modules/ai-core/services/ai-settings.service";
import type { AiSettings } from "@/modules/ai-core/types";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type GenerateOptions = {
  feature:  string;        // tag for the usage log, e.g. "help-assistant", "itinerary-draft"
  system?:  string;
  prompt:   string;
  history?: ChatTurn[];
  createdBy: string;       // uid of the user triggering this call, or "system" for cron-initiated calls
  temperature?: number;
  maxOutputTokens?: number;
};

export type GenerateImagePart = { mimeType: string; base64Data: string };

export type GenerateMultimodalOptions = Omit<GenerateOptions, "history"> & {
  images: GenerateImagePart[];
};

export type GenerateStructuredOptions<T> = GenerateOptions & {
  schema: z.ZodType<T>;
  // Plain-JSON-Schema-shaped description of `schema`'s fields, sent to
  // Gemini's responseSchema so it constrains its own output — Zod schemas
  // aren't directly accepted by the API, so callers describe the shape
  // themselves (same shape their Zod schema validates against).
  responseSchema: Record<string, unknown>;
};

export class AiGenerationError extends Error {}

let cachedSettings: { value: AiSettings; fetchedAt: number } | null = null;
const SETTINGS_TTL_MS = 60_000;

// Admin-SDK read of settings/aiSettings — short-lived in-memory cache so a
// burst of AI calls within the same warm serverless instance doesn't each
// pay a Firestore round trip just to read model config that rarely changes.
async function getSettings(): Promise<AiSettings> {
  if (cachedSettings && Date.now() - cachedSettings.fetchedAt < SETTINGS_TTL_MS) {
    return cachedSettings.value;
  }
  try {
    const dbAdmin = getAdminDb();
    const snap = dbAdmin ? await dbAdmin.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc("aiSettings").get() : null;
    const value = { ...DEFAULT_AI_SETTINGS, ...(snap?.data() ?? {}) } as AiSettings;
    cachedSettings = { value, fetchedAt: Date.now() };
    return value;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

function buildContents(history: ChatTurn[] | undefined, prompt: string, images: GenerateImagePart[] = []) {
  const promptParts: Record<string, unknown>[] = images.map((img) => ({
    inlineData: { mimeType: img.mimeType, data: img.base64Data },
  }));
  promptParts.push({ text: prompt });

  return [
    ...(history ?? []).map((h) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.content }] })),
    { role: "user", parts: promptParts },
  ];
}

async function callGeminiRaw(params: {
  apiKey: string; model: string; system?: string; contents: unknown[];
  temperature: number; maxOutputTokens: number; responseSchema?: Record<string, unknown>;
}): Promise<string> {
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: params.maxOutputTokens,
    temperature: params.temperature,
  };
  if (params.responseSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = params.responseSchema;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: params.contents,
        ...(params.system ? { systemInstruction: { parts: [{ text: params.system }] } } : {}),
        generationConfig,
      }),
    }
  );

  if (!res.ok) throw new AiGenerationError(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AiGenerationError("Empty response from Gemini");
  return text;
}

async function callGroqRaw(params: {
  apiKey: string; model: string; system?: string; history: ChatTurn[]; prompt: string;
  temperature: number; maxOutputTokens: number; jsonMode?: boolean;
}): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.apiKey}` },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxOutputTokens,
      temperature: params.temperature,
      ...(params.jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages: [
        ...(params.system ? [{ role: "system", content: params.system }] : []),
        ...params.history.map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: params.prompt },
      ],
    }),
  });

  if (!res.ok) throw new AiGenerationError(`Groq API error: ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new AiGenerationError("Empty response from Groq");
  return text;
}

export type GenerateTextResult = { text: string; provider: "gemini" | "groq" };

// Tries Gemini first, falls back to Groq on any failure (rate limit, error,
// missing key), throws AiGenerationError only once both are exhausted —
// callers decide what a total failure means for their feature (e.g. the
// help assistant falls back to kb-only, other features may just surface an
// error to the user). `provider` is returned alongside the text since some
// callers (e.g. the help assistant UI) surface which model answered.
export async function generateText(opts: GenerateOptions): Promise<GenerateTextResult> {
  const settings = await getSettings();
  const temperature = opts.temperature ?? settings.temperature;
  const maxOutputTokens = opts.maxOutputTokens ?? settings.maxOutputTokens;
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const startedAt = Date.now();

  if (geminiKey) {
    try {
      const text = await callGeminiRaw({
        apiKey: geminiKey, model: settings.geminiModel, system: opts.system,
        contents: buildContents(opts.history, opts.prompt),
        temperature, maxOutputTokens,
      });
      await logAiUsage({
        feature: opts.feature, provider: "gemini", model: settings.geminiModel, outcome: "success",
        promptChars: opts.prompt.length, responseChars: text.length, latencyMs: Date.now() - startedAt,
        createdBy: opts.createdBy,
      });
      return { text, provider: "gemini" };
    } catch (err) {
      await logAiUsage({
        feature: opts.feature, provider: "gemini", model: settings.geminiModel, outcome: "error",
        errorMessage: err instanceof Error ? err.message : "unknown error",
        promptChars: opts.prompt.length, responseChars: 0, latencyMs: Date.now() - startedAt,
        createdBy: opts.createdBy,
      });
    }
  }

  if (groqKey) {
    const groqStartedAt = Date.now();
    try {
      const text = await callGroqRaw({
        apiKey: groqKey, model: settings.groqModel, system: opts.system,
        history: opts.history ?? [], prompt: opts.prompt, temperature, maxOutputTokens,
      });
      await logAiUsage({
        feature: opts.feature, provider: "groq", model: settings.groqModel, outcome: "success",
        promptChars: opts.prompt.length, responseChars: text.length, latencyMs: Date.now() - groqStartedAt,
        createdBy: opts.createdBy,
      });
      return { text, provider: "groq" };
    } catch (err) {
      await logAiUsage({
        feature: opts.feature, provider: "groq", model: settings.groqModel, outcome: "error",
        errorMessage: err instanceof Error ? err.message : "unknown error",
        promptChars: opts.prompt.length, responseChars: 0, latencyMs: Date.now() - groqStartedAt,
        createdBy: opts.createdBy,
      });
    }
  }

  throw new AiGenerationError("No AI provider available — check GEMINI_API_KEY / GROQ_API_KEY.");
}

// JSON-mode variant: asks Gemini to constrain output to `responseSchema`,
// falls back to Groq's json_object mode (looser — no schema enforcement,
// just "valid JSON"), then validates whichever came back through the
// caller's actual Zod schema before returning it.
export async function generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
  const settings = await getSettings();
  const temperature = opts.temperature ?? settings.temperature;
  const maxOutputTokens = opts.maxOutputTokens ?? settings.maxOutputTokens;
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const startedAt = Date.now();

  let raw: string | null = null;
  let provider: "gemini" | "groq" = "gemini";
  let model = settings.geminiModel;

  if (geminiKey) {
    try {
      raw = await callGeminiRaw({
        apiKey: geminiKey, model: settings.geminiModel, system: opts.system,
        contents: buildContents(opts.history, opts.prompt),
        temperature, maxOutputTokens, responseSchema: opts.responseSchema,
      });
    } catch {
      raw = null;
    }
  }

  if (!raw && groqKey) {
    try {
      provider = "groq";
      model = settings.groqModel;
      raw = await callGroqRaw({
        apiKey: groqKey, model: settings.groqModel, system: opts.system,
        history: opts.history ?? [], prompt: opts.prompt, temperature, maxOutputTokens, jsonMode: true,
      });
    } catch {
      raw = null;
    }
  }

  if (!raw) {
    await logAiUsage({
      feature: opts.feature, provider, model, outcome: "error",
      errorMessage: "No AI provider available", promptChars: opts.prompt.length,
      responseChars: 0, latencyMs: Date.now() - startedAt, createdBy: opts.createdBy,
    });
    throw new AiGenerationError("No AI provider available — check GEMINI_API_KEY / GROQ_API_KEY.");
  }

  const parsed = opts.schema.safeParse(JSON.parse(raw));
  await logAiUsage({
    feature: opts.feature, provider, model, outcome: parsed.success ? "success" : "error",
    errorMessage: parsed.success ? null : "Response failed schema validation",
    promptChars: opts.prompt.length, responseChars: raw.length, latencyMs: Date.now() - startedAt,
    createdBy: opts.createdBy,
  });

  if (!parsed.success) throw new AiGenerationError(`AI response failed schema validation: ${parsed.error.message}`);
  return parsed.data;
}

// Multimodal (image + text) — Gemini only. The Gemini Developer API
// (generativelanguage.googleapis.com, the same free-tier endpoint used
// above) accepts inline image data directly, so this does NOT require
// Vertex AI or the Blaze plan on its own; it's flagged separately in the
// roadmap only where a feature needs Vertex-specific capabilities (e.g.
// Document AI-grade extraction accuracy at volume).
export async function generateMultimodal(opts: GenerateMultimodalOptions): Promise<string> {
  const settings = await getSettings();
  const geminiKey = process.env.GEMINI_API_KEY;
  const startedAt = Date.now();

  if (!geminiKey) throw new AiGenerationError("GEMINI_API_KEY not configured — multimodal calls require Gemini.");

  try {
    const text = await callGeminiRaw({
      apiKey: geminiKey, model: settings.geminiModel, system: opts.system,
      contents: buildContents(undefined, opts.prompt, opts.images),
      temperature: opts.temperature ?? settings.temperature,
      maxOutputTokens: opts.maxOutputTokens ?? settings.maxOutputTokens,
    });
    await logAiUsage({
      feature: opts.feature, provider: "gemini", model: settings.geminiModel, outcome: "success",
      promptChars: opts.prompt.length, responseChars: text.length, latencyMs: Date.now() - startedAt,
      createdBy: opts.createdBy,
    });
    return text;
  } catch (err) {
    await logAiUsage({
      feature: opts.feature, provider: "gemini", model: settings.geminiModel, outcome: "error",
      errorMessage: err instanceof Error ? err.message : "unknown error",
      promptChars: opts.prompt.length, responseChars: 0, latencyMs: Date.now() - startedAt,
      createdBy: opts.createdBy,
    });
    throw err;
  }
}
