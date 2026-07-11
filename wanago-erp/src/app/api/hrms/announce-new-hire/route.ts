import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireHrOrAdmin } from "@/lib/firebase/admin";
import { notifyUserServer } from "@/lib/server/notify-server";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { isRateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

type EmployeeDoc = { id: string; userId?: string | null; email: string | null; employeeStatus?: string };
type UserDoc = { id: string; email: string };

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Client-callable — employee.service.ts's createEmployee() runs in the
// browser and can't import notify-server.ts directly (Node-only
// firebase-admin). Fired best-effort alongside the new hire's own welcome
// email; this one instead tells everyone ELSE on the team about the new
// hire, same "introduce the new member" idea the user asked for.
// Gated to HR/Admin — this route also enumerates every active employee's
// contact info server-side, so it needs the same real permission check as
// the Employees page it's triggered from, not just an authenticated caller.
export async function POST(req: NextRequest) {
  const caller = await requireHrOrAdmin(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (isRateLimited(`announce-new-hire:${caller.uid}`, 60_000, 30)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let payload: { employeeId?: string; fullName?: string; designation?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!payload.employeeId || !payload.fullName || !payload.designation) {
    return NextResponse.json({ error: "Missing employeeId/fullName/designation" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });

  const [employeesSnap, usersSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES).get(),
    db.collection(FIRESTORE_COLLECTIONS.USERS).get(),
  ]);
  const userById = new Map(usersSnap.docs.map(d => [d.id, ({ id: d.id, ...d.data() }) as UserDoc]));

  const teammates = employeesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }) as EmployeeDoc)
    .filter(e => e.id !== payload.employeeId && e.employeeStatus === "active" && e.userId);

  let notified = 0;
  await Promise.allSettled(
    teammates.map(async (teammate) => {
      const user = userById.get(teammate.userId!);
      await notifyUserServer({
        userId:   teammate.userId,
        email:    user?.email ?? teammate.email ?? null,
        title:    `🎉 Please welcome ${payload.fullName} to Team Wanago!`,
        body:     `${payload.fullName} just joined Wanago Travel & Co as our new ${payload.designation}. Say hi and make them feel at home!`,
        link:     "/hrms/employees",
        category: "system",
      });
      notified++;
    })
  );

  return NextResponse.json({ ok: true, notified });
}
