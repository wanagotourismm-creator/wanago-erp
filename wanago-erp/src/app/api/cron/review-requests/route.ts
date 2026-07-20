import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAppUrl } from "@/lib/app-url";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";
import { sendReviewRequestEmail } from "@/lib/server/notify-server";
import { sendWhatsAppSmart } from "@/lib/whatsapp/template-router";
import { FIRESTORE_COLLECTIONS, WHATSAPP_TEMPLATE_PURPOSES } from "@/lib/constants";

export const runtime = "nodejs";

type AdminTimestamp = { toMillis: () => number };
function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "object" && "toMillis" in value) return (value as AdminTimestamp).toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") { const t = new Date(value).getTime(); return Number.isNaN(t) ? null : t; }
  return null;
}

type ReviewRequestDoc = {
  id: string;
  customerName: string; customerPhone: string; customerEmail: string | null;
  token: string; scheduledFor: unknown;
};

// Verified daily by Vercel Cron (see vercel.json) — sends the post-trip
// review/NPS request for every reviewRequests doc whose delay has passed.
// Single-field query (sentAt == null, auto-indexed) + in-memory date
// filter, same convention as daily-reminders/route.ts, to avoid needing a
// manually-deployed composite index for (sentAt, scheduledFor).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 500 });
  }

  const snap = await db.collection(FIRESTORE_COLLECTIONS.REVIEW_REQUESTS)
    .where("sentAt", "==", null)
    .get();

  const now = Date.now();
  const due = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ReviewRequestDoc)
    .filter((r) => {
      const t = toMillis(r.scheduledFor);
      return t != null && t <= now;
    });

  if (due.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const company = await getCompanySettingsServer();
  let sent = 0;
  let failed = 0;

  for (const request of due) {
    try {
      const link = `${getAppUrl()}/review/${request.token}`;

      const [whatsappResult, emailResult] = await Promise.all([
        sendWhatsAppSmart({
          to: request.customerPhone,
          purpose: WHATSAPP_TEMPLATE_PURPOSES.REVIEW_REQUEST,
          variables: [request.customerName, company.businessName, link],
          fallbackBody: `Hi ${request.customerName}! We hope you had a wonderful trip with ${company.businessName}. Could you share your feedback? ${link}`,
        }),
        request.customerEmail
          ? sendReviewRequestEmail({ to: request.customerEmail, customerName: request.customerName, link })
          : Promise.resolve({ ok: false }),
      ]);

      await db.collection(FIRESTORE_COLLECTIONS.REVIEW_REQUESTS).doc(request.id).update({
        sentAt: FieldValue.serverTimestamp(),
        sentChannels: { whatsapp: whatsappResult.ok, email: emailResult.ok },
        updatedAt: FieldValue.serverTimestamp(),
      });
      sent++;
    } catch (err) {
      console.error(`[cron/review-requests] failed for ${request.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
