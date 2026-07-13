// Server-only — imported exclusively by the WhatsApp webhook route.
// Classifies exactly one inbound message per call, triggered by Meta's
// webhook (i.e. once per real customer message), not by client rendering —
// that keeps this "automatic" without multiplying AI calls by however many
// staff have the inbox open.
import { z } from "zod";
import { generateStructured, AiGenerationError } from "@/modules/ai-core/services/geminiService";

const classifySchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  intent:    z.enum(["new_inquiry", "booking_question", "payment", "complaint", "general"]),
});

const classifyResponseSchema = {
  type: "OBJECT",
  properties: {
    sentiment: { type: "STRING", enum: ["positive", "neutral", "negative"] },
    intent:    { type: "STRING", enum: ["new_inquiry", "booking_question", "payment", "complaint", "general"] },
  },
  required: ["sentiment", "intent"],
};

export type WhatsAppClassification = z.infer<typeof classifySchema>;

const SYSTEM_PROMPT = [
  "Classify this single inbound WhatsApp message from a customer to a travel agency (Wanago Tours & Travels).",
  "sentiment: the customer's emotional tone in this message — positive, neutral, or negative.",
  "intent: new_inquiry (asking about a new trip/destination), booking_question (question about an existing booking/itinerary), payment (payment/invoice related), complaint (expressing a problem or dissatisfaction), or general (greeting, small talk, anything else).",
].join("\n");

// Returns null on any failure (rate limit, malformed response) rather than
// throwing — a classification miss should never block the webhook from
// saving the actual message, which is the important part.
export async function classifyInboundMessage(body: string): Promise<WhatsAppClassification | null> {
  if (!body.trim()) return null;
  try {
    return await generateStructured({
      feature: "whatsapp-classify",
      system: SYSTEM_PROMPT,
      prompt: body.slice(0, 1000),
      schema: classifySchema,
      responseSchema: classifyResponseSchema,
      createdBy: "system",
      maxOutputTokens: 50,
    });
  } catch (err) {
    if (err instanceof AiGenerationError) return null;
    throw err;
  }
}
