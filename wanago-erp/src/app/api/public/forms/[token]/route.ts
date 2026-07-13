import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS, REF_FORMATS } from "@/lib/constants";
import { buildLeadDraftFromAnswers } from "@/modules/forms/utils/actions";
import type { FormActions } from "@/modules/forms/types";

export const runtime = "nodejs";

// Same no-login, token-gated security boundary as the booking-link route —
// only reachable with the exact shareToken, only for forms explicitly
// published as Public, and only reads/writes the fields this feature needs.

type FormRecord = {
  id: string;
  title: string;
  description: string | null;
  fields: unknown[];
  visibility: string;
  formStatus: string;
  officeId: string;
  officeName: string;
  actions: FormActions;
};

// Mirrors nextRefNumber() (lib/firebase/ref-counter.ts) but against the
// Admin SDK's transaction API — no client-side equivalent is usable from a
// server route with no signed-in user (same pattern as the referral route).
async function nextRefNumberAdmin(prefix: keyof typeof REF_FORMATS): Promise<string> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK not configured");
  const pfx = REF_FORMATS[prefix];
  const counterRef = db.collection("refCounters").doc(pfx);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? (snap.data()?.next as number) : 1001;
    tx.set(counterRef, { next: current + 1 });
    return `${pfx}-${current}`;
  });
}

async function findPublicForm(token: string): Promise<FormRecord | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(FIRESTORE_COLLECTIONS.FORMS)
    .where("shareToken", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const form = { id: snap.docs[0].id, ...snap.docs[0].data() } as FormRecord;
  if (form.visibility !== "public" || form.formStatus !== "published") return null;
  return form;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const form = await findPublicForm(token);
  if (!form) return NextResponse.json({ error: "This form isn't available" }, { status: 404 });

  return NextResponse.json({
    title: form.title,
    description: form.description,
    fields: form.fields,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const form = await findPublicForm(token);
  if (!form) return NextResponse.json({ error: "This form isn't available" }, { status: 404 });

  let body: { answers?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.answers) return NextResponse.json({ error: "Missing answers" }, { status: 400 });

  await db.collection(FIRESTORE_COLLECTIONS.FORM_RESPONSES).add({
    formId: form.id,
    answers: body.answers,
    submittedByName: null,
    submittedByUserId: null,
    createdBy: "public",
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await db.collection(FIRESTORE_COLLECTIONS.FORMS).doc(form.id).update({
    responseCount: FieldValue.increment(1),
  });

  await runFormActionsAdmin(db, form, body.answers).catch(() => {});

  return NextResponse.json({ ok: true });
}

// Best-effort — mirrors runFormActions() in form-response.service.ts, but
// against the Admin SDK since a public visitor has no client-side Firestore
// write access. A failure here must never fail the submission itself.
async function runFormActionsAdmin(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  form: FormRecord,
  answers: Record<string, unknown>
): Promise<void> {
  const { actions } = form;
  if (!actions) return;
  const now = FieldValue.serverTimestamp();

  if (actions.notifyUserId) {
    await db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).add({
      recipientId: actions.notifyUserId,
      title: `New response — ${form.title}`,
      body: "A new form response just came in.",
      link: "/forms",
      category: "system",
      read: false,
      createdBy: actions.notifyUserId,
      createdAt: now, updatedAt: now,
      status: "active",
    });
  }

  if (actions.createLead) {
    const draft = buildLeadDraftFromAnswers(answers, actions.leadMapping);
    const refNumber = await nextRefNumberAdmin("LEAD");
    await db.collection(FIRESTORE_COLLECTIONS.LEADS).add({
      ...draft,
      alternatePhone: null,
      destination: "Not specified",
      tripType: null, travelDate: null, returnDate: null, duration: null, pax: null, budget: null,
      stage: "new", priority: "warm", source: `Form: ${form.title}`,
      assignedTo: null, agentName: null,
      matchedCustomerId: null,
      officeId: form.officeId, officeName: form.officeName,
      lastContactedAt: null,
      refNumber,
      createdAt: now, updatedAt: now,
      createdBy: "public-form",
      status: "active",
    });
  }
}
