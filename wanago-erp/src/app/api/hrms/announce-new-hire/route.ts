import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { notifyUserServer } from "@/lib/server/notify-server";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

type EmployeeDoc = { id: string; userId?: string | null; email: string | null; employeeStatus?: string };
type UserDoc = { id: string; email: string };

// Client-callable — employee.service.ts's createEmployee() runs in the
// browser and can't import notify-server.ts directly (Node-only
// firebase-admin). Fired best-effort alongside the new hire's own welcome
// email; this one instead tells everyone ELSE on the team about the new
// hire, same "introduce the new member" idea the user asked for.
export async function POST(req: NextRequest) {
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
