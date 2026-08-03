import type { FirestoreRecord } from "@/types/global";

// The only place a real, currently-active discount/offer is stored — the
// customer-facing WhatsApp AI (whatsapp-ai-reply.service.ts) and the AI
// Employee's draftCampaignMessage tool are only ever allowed to mention an
// offer that exists here and is within its validity window, never invent one.
export type Offer = FirestoreRecord & {
  title:       string;
  description: string;
  destination: string | null; // null = applies to all destinations
  validFrom:   string; // "YYYY-MM-DD"
  validTo:     string; // "YYYY-MM-DD"
  isActive:    boolean;
};

export type OfferFormData = Omit<Offer, "id" | "createdAt" | "updatedAt" | "status">;
