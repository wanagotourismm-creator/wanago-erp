import { z } from "zod";

// Validates Gemini's structured JSON response for itinerary drafting — kept
// separate from itinerarySchema (the form's save schema) since a draft is
// allowed to be looser (e.g. no officeId/officeName, which the AI has no
// business inventing) and is always reviewed/edited by a human in the form
// before it's ever saved.
export const itineraryDraftSchema = z.object({
  title:       z.string(),
  tagline:     z.string(),
  inclusions:  z.array(z.string()),
  exclusions:  z.array(z.string()),
  days: z.array(z.object({
    dayNumber:   z.number(),
    title:       z.string(),
    description: z.string(),
  })),
});

export type ItineraryDraft = z.infer<typeof itineraryDraftSchema>;

// Gemini's responseSchema wants OpenAPI-style types (uppercase), a
// hand-written mirror of itineraryDraftSchema above — the API doesn't
// accept a Zod schema directly.
export const itineraryDraftResponseSchema = {
  type: "OBJECT",
  properties: {
    title:   { type: "STRING" },
    tagline: { type: "STRING" },
    inclusions: { type: "ARRAY", items: { type: "STRING" } },
    exclusions: { type: "ARRAY", items: { type: "STRING" } },
    days: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          dayNumber:   { type: "INTEGER" },
          title:       { type: "STRING" },
          description: { type: "STRING" },
        },
        required: ["dayNumber", "title", "description"],
      },
    },
  },
  required: ["title", "tagline", "inclusions", "exclusions", "days"],
};
