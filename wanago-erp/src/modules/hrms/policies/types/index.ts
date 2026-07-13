import type { FirestoreRecord } from "@/types/global";

// Real uploaded PDF only — file bytes live in Supabase Storage (see
// lib/storage/upload.ts; Firebase Storage needs Blaze, not provisioned).
// extractedText is populated server-side right after upload (Gemini
// multimodal reads the PDF directly, no separate PDF-parsing dependency
// needed) and is what actually grounds the Ask HR assistant — fileUrl is
// only for a human to open the original.
export type HrPolicyDocument = FirestoreRecord & {
  title:         string;
  fileUrl:       string;
  extractedText: string | null; // null until extraction finishes; assistant skips docs still in this state
  extractionError: string | null;
  docStatus:     "active" | "archived";
};
