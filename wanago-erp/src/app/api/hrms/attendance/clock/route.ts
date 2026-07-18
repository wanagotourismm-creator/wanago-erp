import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/admin";
import { isRateLimited } from "@/lib/server/rate-limit";
import { calcHours } from "@/lib/attendance-hours";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// The device clock previously stamped both the date and the time for a
// check-in/out (see useEss.ts's old nowTime()/todayStr()), which a wrong
// device timezone/clock could misrecord, and the existence-check-then-write
// in attendance.service.ts's createAttendanceRecord() was a plain
// read-then-write with no transaction, so two near-simultaneous check-ins
// could both pass it. This route fixes both: date/time come from the
// server (IST, since this is an India-only deployment), and the
// check-then-create runs inside one Firestore transaction.
const TIME_ZONE = "Asia/Kolkata";

function serverDateAndTime(): { date: string; time: string } {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  return { date, time };
}

type ClockInBody = {
  type: "in";
  employeeId: string;
  employeeName: string;
  officeId: string;
  clockInLat: number | null;
  clockInLng: number | null;
  withinGeofence: boolean | null;
  clockInAddress: string | null;
  clockInSelfieUrl: string | null;
  distanceFromOfficeMeters: number | null;
  locationApprovalStatus: "pending" | null;
};

type ClockOutBody = {
  type: "out";
  recordId: string;
  employeeId: string;
  clockOutLat: number | null;
  clockOutLng: number | null;
  withinGeofenceOut: boolean | null;
  clockOutAddress: string | null;
  clockOutSelfieUrl: string | null;
  distanceFromOfficeMeters: number | null;
  locationApprovalStatus: "pending" | null;
};

export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (isRateLimited(`attendance-clock:${caller.uid}`, 60_000, 20)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) return NextResponse.json({ error: "Server isn't configured for this action." }, { status: 501 });

  let body: ClockInBody | ClockOutBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.employeeId || (body.type !== "in" && body.type !== "out")) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verifies the caller's own users/{uid}.employeeId matches the
  // employeeId in the request — this is what employee.service.ts's
  // syncEmployeeIdOnUser denormalizes onto the account, so this route
  // (and the leads/customers/bookings Firestore rules) both trust the
  // same link rather than a client-supplied claim.
  const userDoc = await adminDb.collection(FIRESTORE_COLLECTIONS.USERS).doc(caller.uid).get();
  if (userDoc.data()?.employeeId !== body.employeeId) {
    return NextResponse.json({ error: "This login isn't linked to that employee record." }, { status: 403 });
  }

  const { date, time } = serverDateAndTime();
  const collection = adminDb.collection(FIRESTORE_COLLECTIONS.HRMS_CHECK_INS);

  try {
    if (body.type === "in") {
      const record = await adminDb.runTransaction(async (tx) => {
        const existing = await tx.get(
          collection.where("employeeId", "==", body.employeeId).where("date", "==", date)
        );
        if (!existing.empty) throw new Error("ALREADY_CLOCKED_IN");

        const ref = collection.doc();
        tx.set(ref, {
          employeeId: body.employeeId,
          employeeName: body.employeeName,
          date, status: "present",
          clockIn: time, clockOut: null,
          officeId: body.officeId,
          breakStartTime: null, breakMinutes: 0,
          hoursWorked: null, needsReview: false,
          clockInLat: body.clockInLat, clockInLng: body.clockInLng,
          withinGeofence: body.withinGeofence,
          clockInAddress: body.clockInAddress,
          clockInSelfieUrl: body.clockInSelfieUrl,
          clockOutLat: null, clockOutLng: null, withinGeofenceOut: null,
          clockOutAddress: null, clockOutSelfieUrl: null,
          distanceFromOfficeMeters: body.distanceFromOfficeMeters,
          locationApprovalStatus: body.locationApprovalStatus,
          locationApprovedBy: null, locationApprovedAt: null,
          notes: null,
          createdBy: caller.uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { id: ref.id };
      });
      return NextResponse.json({ id: record.id, date, clockIn: time });
    }

    // type === "out"
    if (!body.recordId) return NextResponse.json({ error: "Missing recordId" }, { status: 400 });
    const ref = collection.doc(body.recordId);
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const data = snap.data()!;
      if (data.employeeId !== body.employeeId) throw new Error("FORBIDDEN");
      if (data.clockOut) throw new Error("ALREADY_CLOCKED_OUT");

      const { hoursWorked, needsReview } = calcHours(data.clockIn, time, data.breakMinutes ?? 0);
      tx.update(ref, {
        clockOut: time,
        hoursWorked, needsReview,
        clockOutLat: body.clockOutLat, clockOutLng: body.clockOutLng,
        withinGeofenceOut: body.withinGeofenceOut,
        clockOutAddress: body.clockOutAddress,
        clockOutSelfieUrl: body.clockOutSelfieUrl,
        distanceFromOfficeMeters: body.distanceFromOfficeMeters ?? data.distanceFromOfficeMeters,
        locationApprovalStatus: body.locationApprovalStatus ?? data.locationApprovalStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { hoursWorked };
    });
    return NextResponse.json({ clockOut: time, hoursWorked: result.hoursWorked });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to record attendance";
    if (message === "ALREADY_CLOCKED_IN") return NextResponse.json({ error: "Attendance already marked for this employee on this date" }, { status: 409 });
    if (message === "ALREADY_CLOCKED_OUT") return NextResponse.json({ error: "You've already checked out today" }, { status: 409 });
    if (message === "NOT_FOUND") return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
