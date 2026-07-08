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

// Populates (and refreshes) the default training catalog covering every
// major section of the app (see seed-data.ts) — triggered by the
// "Generate Default Training Content" button on the Onboarding Training
// admin page. Safe to re-run any time seed-data.ts changes: a module whose
// title already exists has its description/order updated and its steps
// fully replaced with the current seed content, rather than being skipped
// — that's what lets content expansions actually reach modules that were
// already generated. Manually-created modules (titles not in the seed
// list) are never touched.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(bearerToken(req));
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });

  const existingSnap = await db.collection(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_MODULES).get();
  const existingByTitle = new Map(existingSnap.docs.map((d) => [(d.data().title as string)?.toLowerCase(), d.id]));

  let modulesCreated = 0;
  let modulesRefreshed = 0;
  let stepsCreated = 0;

  for (let index = 0; index < DEFAULT_TRAINING_MODULES.length; index++) {
    const seedModule = DEFAULT_TRAINING_MODULES[index];
    const existingId = existingByTitle.get(seedModule.title.toLowerCase());

    let moduleId: string;
    if (existingId) {
      moduleId = existingId;
      await db.collection(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_MODULES).doc(existingId).update({
        order: index, description: seedModule.description, updatedAt: FieldValue.serverTimestamp(),
      });
      // Replace this module's steps entirely — old step docs (and any
      // cached voiceover URLs on them) are discarded; the walkthrough
      // engine only ever reads the current steps, so stale ones would
      // just be dead data. Employees mid-module will see progress reset
      // for that module (a new step set means their old completedStepIds
      // no longer line up) — acceptable while content is still evolving.
      const oldStepsSnap = await db.collection(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_STEPS)
        .where("moduleId", "==", existingId).get();
      if (!oldStepsSnap.empty) {
        const delBatch = db.batch();
        oldStepsSnap.docs.forEach((d) => delBatch.delete(d.ref));
        await delBatch.commit();
      }
      modulesRefreshed++;
    } else {
      const moduleRef = await db.collection(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_MODULES).add({
        title: seedModule.title,
        description: seedModule.description,
        order: index,
        mandatory: false,
        status: "active",
        createdBy: admin.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      moduleId = moduleRef.id;
      modulesCreated++;
    }

    const batch = db.batch();
    seedModule.steps.forEach((step, i) => {
      const stepRef = db.collection(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_STEPS).doc();
      batch.set(stepRef, {
        moduleId,
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

  return NextResponse.json({ ok: true, modulesCreated, modulesRefreshed, stepsCreated });
}
