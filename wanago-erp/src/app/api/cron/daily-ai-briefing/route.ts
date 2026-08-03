import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { notifyUserServer } from "@/lib/server/notify-server";
import { isAiDailyBriefingEnabled } from "@/modules/ai-core/services/ai-settings.server";
import { buildCommandCenter, type CommandCenterItem } from "@/modules/dashboard/services/command-center.service";
import { FIRESTORE_COLLECTIONS, INVOICE_STATUS } from "@/lib/constants";

export const runtime = "nodejs";

type UserDoc = { id: string; email: string; systemRole?: string };

const BRIEFING_LIMIT = 8;

const ENTITY_EMOJI: Record<CommandCenterItem["entityType"], string> = {
  lead: "🎯", quotation: "📄", invoice: "💰", customer: "👤", booking: "✈️",
};

function formatBriefing(items: CommandCenterItem[]): string {
  if (items.length === 0) {
    return "Nothing urgent needs your attention today — pipeline looks clear.";
  }
  const lines = items.map((item, i) => `${i + 1}. ${ENTITY_EMOJI[item.entityType]} ${item.title} — ${item.detail}`);
  return ["Today's priorities:", ...lines].join("\n");
}

// Daily, action-oriented briefing for admins — distinct from the existing
// weekly-founder-briefing/weekly-ai-insights/weekly-sales-digest crons,
// which are revenue-reporting digests that only get STORED (viewed later on
// a dashboard), never pushed. This one is deliberately daily and pushed
// (in-app + email), reusing buildCommandCenter's already-proven "what needs
// attention today" ranking (src/modules/dashboard/services/command-center.service.ts)
// rather than re-deriving new urgency logic — same signals the in-app
// Command Center widget already shows, just delivered proactively instead
// of waiting for someone to open the dashboard.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAiDailyBriefingEnabled())) {
    return NextResponse.json({ skipped: true, reason: "aiDailyBriefingEnabled is off" });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 500 });
  }

  const [leadsSnap, callLogsSnap, quotationsSnap, invoicesSnap, bookingsSnap, usersSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.LEADS).get(),
    db.collection(FIRESTORE_COLLECTIONS.CALL_LOGS).get(),
    db.collection(FIRESTORE_COLLECTIONS.QUOTATIONS).get(),
    db.collection(FIRESTORE_COLLECTIONS.INVOICES).where("status", "==", INVOICE_STATUS.OVERDUE).get(),
    db.collection(FIRESTORE_COLLECTIONS.BOOKINGS).get(),
    db.collection(FIRESTORE_COLLECTIONS.USERS).get(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asDocs = (snap: FirebaseFirestore.QuerySnapshot): any[] => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const items = buildCommandCenter({
    leads: asDocs(leadsSnap), callLogs: asDocs(callLogsSnap), quotations: asDocs(quotationsSnap),
    invoices: asDocs(invoicesSnap), bookings: asDocs(bookingsSnap), limit: BRIEFING_LIMIT,
  });

  const body = formatBriefing(items);
  const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserDoc);
  const admins = users.filter((u) => u.systemRole === "admin" || u.systemRole === "super_admin");

  await Promise.allSettled(
    admins.map((admin) =>
      notifyUserServer({
        userId: admin.id, email: admin.email,
        title: `Daily briefing — ${items.length} item${items.length === 1 ? "" : "s"} need attention`,
        body, link: "/dashboard", category: "followup",
      })
    )
  );

  return NextResponse.json({ ok: true, itemCount: items.length, recipientCount: admins.length });
}
