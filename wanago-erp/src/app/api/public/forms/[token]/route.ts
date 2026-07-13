import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

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
};

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

  return NextResponse.json({ ok: true });
}
