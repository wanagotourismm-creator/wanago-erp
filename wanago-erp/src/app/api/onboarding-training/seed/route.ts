import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, requireAdmin } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { DEFAULT_TRAINING_MODULES } from "@/modules/onboarding-training/seed-data";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Populates the default training catalog covering every major section of
// the app (see seed-data.ts) — triggered by the "Generate Default Training
// Content" button on the Onboarding Training admin page. Idempotent: any
// module whose title already exists is left untouched, so re-running this
// (e.g. after adding new seed content) never creates duplicates.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(bearerToken(req));
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });

  const existingSnap = await db.collection(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_MODULES).get();
  const existingTitles = new Set(existingSnap.docs.map((d) => (d.data().title as string)?.toLowerCase()));

  let modulesCreated = 0;
  let stepsCreated = 0;
  const skipped: string[] = [];

  for (const seedModule of DEFAULT_TRAINING_MODULES) {
    if (existingTitles.has(seedModule.title.toLowerCase())) {
      skipped.push(seedModule.title);
      continue;
    }

    const moduleRef = await db.collection(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_MODULES).add({
      title: seedModule.title,
      description: seedModule.description,
      status: "active",
      createdBy: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    modulesCreated++;

    const batch = db.batch();
    seedModule.steps.forEach((step, i) => {
      const stepRef = db.collection(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_STEPS).doc();
      batch.set(stepRef, {
        moduleId: moduleRef.id,
        order: i,
        targetPath: step.targetPath,
        targetSelector: step.targetSelector,
        explanationEn: step.explanationEn,
        explanationMl: step.explanationMl,
        quiz: step.quiz
          ? { questionEn: step.quiz.questionEn, questionMl: step.quiz.questionMl, options: step.quiz.options, correctIndex: step.quiz.correctIndex }
          : null,
        audioUrlEn: null,
        audioUrlMl: null,
        status: "active",
        createdBy: admin.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      stepsCreated++;
    });
    await batch.commit();
  }

  return NextResponse.json({ ok: true, modulesCreated, stepsCreated, skipped });
}
