import { z } from "zod";

// Descriptions only, deliberately — a quotation's lineItems.amount is a
// real price on a customer-facing document, and AI has no basis for
// inventing supplier rates. The agent always fills in real amounts;
// this only saves them typing out the typical line items for a trip.
export const quoteDraftSchema = z.object({
  lineItems: z.array(z.object({ description: z.string() })),
});

export type QuoteDraft = z.infer<typeof quoteDraftSchema>;

export const quoteDraftResponseSchema = {
  type: "OBJECT",
  properties: {
    lineItems: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { description: { type: "STRING" } },
        required: ["description"],
      },
    },
  },
  required: ["lineItems"],
};
