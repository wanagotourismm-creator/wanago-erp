import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

// Firestore Timestamps arrive as {seconds, nanoseconds}; a doc can also
// legitimately hold a plain Date/string (some server-side writers use
// those), or null very briefly on a local pending write before the
// serverTimestamp() round-trip resolves. Mirrors the Timestamp union in
// src/types/global.ts.
export const timestampSchema = z.union([
  z.object({ seconds: z.number(), nanoseconds: z.number() }),
  z.date(),
  z.string(),
  z.null(),
]);

// The minimum shape every document in this app is expected to have —
// mirrors FirestoreRecord (src/types/global.ts). Deliberately permissive
// (createdBy/status optional) since rejecting on these would risk the
// "disappearing records" bug class this validation exists to prevent, not
// just move it — a doc missing a business field should still render.
export const firestoreRecordSchema = z.object({
  id: z.string(),
  createdAt: timestampSchema.optional(),
  updatedAt: timestampSchema.optional(),
  createdBy: z.string().optional(),
  status: z.string().optional(),
});

// Called by BaseRepository when a document fails its module's schema.
// Non-fatal by design (see PRD Pillar 1, "Zod-validated Firestore reads"):
// the bad document is logged and skipped, never thrown or rendered raw.
export function logInvalidDocument(collectionName: string, id: string, error: z.ZodError) {
  const message = `[Firestore] Invalid document skipped: ${collectionName}/${id}`;
  console.error(message, error.flatten());
  Sentry.captureMessage(message, {
    level: "warning",
    extra: { collectionName, id, issues: error.issues },
  });
}
