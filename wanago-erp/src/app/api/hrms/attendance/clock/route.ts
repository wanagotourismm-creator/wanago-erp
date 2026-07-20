import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type Firestore, type DocumentData } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/admin";
import { isRateLimited } from "@/lib/server/rate-limit";
import { calcHours } from "@/lib/attendance-hours";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { distanceMeters } from "@/lib/geo";
import { detectSuspiciousLocation, SUSPICION_REASON_LABELS, type SuspicionReason } from "@/lib/geo-fraud";
import { notifyUser } from "@/lib/notify";
import { fetchUsersByPermission } from "@/lib/notify-recipients";
import type { AttendanceRecord } from "@/modules/hrms/shared/types";

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

// Everything that decides *whether this attempt is allowed* — geofence
// distance, selfie requirement, spoofing heuristics — used to be computed
// client-side and simply reported to this route as trusted fields
// (withinGeofence, distanceFromOfficeMeters, locationApprovalStatus). That
// meant anyone who called this endpoint directly (devtools, curl) with a
// valid ID token could self-report "withinGeofence: true" and skip the
// selfie/approval/fraud checks entirely. This route now only accepts the
// raw device observation (lat/lng/accuracy) and re-derives every gating
// decision itself from the employee's actual assigned office — the client
// still runs the same logic first for a responsive UI, but it's advisory
// only and re-verified here before anything is written.
type ClockInBody = {
  type: "in";
  employeeId: string;
  clockInLat: number | null;
  clockInLng: number | null;
  clockInAccuracy: number | null;
  clockInAddress: string | null;
  clockInSelfieUrl: string | null;
  lateReason: string | null;
};

type ClockOutBody = {
  type: "out";
  recordId: string;
  employeeId: string;
  clockOutLat: number | null;
  clockOutLng: number | null;
  clockOutAccuracy: number | null;
  clockOutAddress: string | null;
  clockOutSelfieUrl: string | null;
};

function validPos(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// Selfies upload straight from the browser to Storage (attendance.service.ts's
// uploadAttendanceSelfie), so this route never sees the file itself — only
// the resulting URL. Checking the URL is scoped under this employee's own
// attendance-selfies/{employeeId}/ prefix stops someone from skipping the
// upload entirely and just handing the API any public image URL as "proof".
function selfieBelongsToEmployee(url: unknown, employeeId: string): boolean {
  if (typeof url !== "string" || !url) return false;
  return url.includes(`attendance-selfies/${employeeId}/`) || url.includes(`attendance-selfies%2F${employeeId}%2F`);
}

type GeofenceResult = {
  pos: { lat: number; lng: number } | null;
  withinGeofence: boolean | null;
  distanceMeters: number | null;
  requiresSelfie: boolean;
};

function evaluateGeofence(lat: unknown, lng: unknown, office: DocumentData | null): GeofenceResult {
  const pos = validPos(lat, lng);
  const geofenceConfigured = office?.latitude != null && office?.longitude != null && office?.geofenceRadiusMeters != null;

  let distance: number | null = null;
  let withinGeofence: boolean | null = null;
  if (geofenceConfigured && pos) {
    distance = distanceMeters(pos.lat, pos.lng, office!.latitude, office!.longitude);
    withinGeofence = distance <= office!.geofenceRadiusMeters;
  }

  return {
    pos, withinGeofence, distanceMeters: distance,
    requiresSelfie: geofenceConfigured && (!pos || withinGeofence === false),
  };
}

async function notifyHrOfSuspiciousAttempt(data: {
  employeeName: string; officeName: string; action: "check_in" | "check_out"; reasons: SuspicionReason[];
}): Promise<void> {
  try {
    const recipients = await fetchUsersByPermission("hrms:manage");
    const reasonText = data.reasons.map((r) => SUSPICION_REASON_LABELS[r] ?? r).join("; ");
    await Promise.all(
      recipients.map((u) =>
        notifyUser({
          userId:   u.id,
          email:    u.email,
          title:    `Suspicious ${data.action === "check_in" ? "check-in" : "check-out"} blocked — ${data.employeeName}`,
          body:     `${data.employeeName} at ${data.officeName}: ${reasonText}`,
          link:     "/hrms-admin",
          category: "system",
        })
      )
    );
  } catch {
    // ignore — this is an alert, not the record of the event itself
  }
}

// Runs the same location-spoofing heuristics geo-fraud.ts always ran, but
// now against attendance history this route fetches itself (rather than a
// list the client already had loaded) so a direct API call can't skip it.
// Returns true (and logs + alerts HR) when the attempt should be blocked.
async function checkAndBlockSuspicious(adminDb: Firestore, params: {
  employeeId: string; employeeName: string; officeId: string | null; officeName: string;
  action: "check_in" | "check_out"; pos: { lat: number; lng: number }; accuracy: number | null;
  today: string; createdBy: string;
}): Promise<boolean> {
  const collection = adminDb.collection(FIRESTORE_COLLECTIONS.HRMS_CHECK_INS);
  const recentSnap = await collection.where("employeeId", "==", params.employeeId).orderBy("date", "desc").limit(8).get();
  const recentRecords = recentSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as AttendanceRecord)
    .filter((r) => r.date !== params.today);

  const reasons = detectSuspiciousLocation({
    pos: { lat: params.pos.lat, lng: params.pos.lng, accuracy: params.accuracy },
    action: params.action,
    recentRecords,
  });
  if (reasons.length === 0) return false;

  await adminDb.collection(FIRESTORE_COLLECTIONS.HRMS_SUSPICIOUS_ATTENDANCE).add({
    employeeId: params.employeeId, employeeName: params.employeeName,
    officeId: params.officeId, officeName: params.officeName,
    action: params.action, lat: params.pos.lat, lng: params.pos.lng, accuracy: params.accuracy,
    reasons, reviewed: false, reviewedBy: null, reviewedAt: null, status: "active",
    createdBy: params.createdBy,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  notifyHrOfSuspiciousAttempt({ employeeName: params.employeeName, officeName: params.officeName, action: params.action, reasons }).catch(() => {});
  return true;
}

const SUSPICIOUS_BLOCK_MESSAGE =
  "We couldn't verify your location for this attempt, so it's been blocked and flagged for HR review. If this is a mistake, contact HR or submit an attendance correction.";

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

  const employeeSnap = await adminDb.collection(FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES).doc(body.employeeId).get();
  if (!employeeSnap.exists) return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
  const employee = employeeSnap.data()!;

  const { date, time } = serverDateAndTime();
  const collection = adminDb.collection(FIRESTORE_COLLECTIONS.HRMS_CHECK_INS);

  try {
    if (body.type === "in") {
      let office: DocumentData | null = null;
      if (employee.officeId) {
        const officeSnap = await adminDb.collection(FIRESTORE_COLLECTIONS.OFFICES).doc(employee.officeId).get();
        if (officeSnap.exists) office = officeSnap.data()!;
      }

      const geo = evaluateGeofence(body.clockInLat, body.clockInLng, office);
      const accuracy = typeof body.clockInAccuracy === "number" ? body.clockInAccuracy : null;

      if (geo.requiresSelfie && !selfieBelongsToEmployee(body.clockInSelfieUrl, body.employeeId)) {
        return NextResponse.json({ error: "A selfie is required to check in from outside the office." }, { status: 400 });
      }

      if (geo.pos) {
        const blocked = await checkAndBlockSuspicious(adminDb, {
          employeeId: body.employeeId, employeeName: employee.fullName, officeId: employee.officeId ?? null,
          officeName: office?.name ?? "", action: "check_in", pos: geo.pos, accuracy, today: date, createdBy: caller.uid,
        });
        if (blocked) return NextResponse.json({ error: SUSPICIOUS_BLOCK_MESSAGE }, { status: 403 });
      }

      const record = await adminDb.runTransaction(async (tx) => {
        const existing = await tx.get(
          collection.where("employeeId", "==", body.employeeId).where("date", "==", date)
        );
        if (!existing.empty) throw new Error("ALREADY_CLOCKED_IN");

        const ref = collection.doc();
        tx.set(ref, {
          employeeId: body.employeeId,
          employeeName: employee.fullName,
          date, status: "present",
          clockIn: time, clockOut: null,
          officeId: employee.officeId ?? null,
          breakStartTime: null, breakMinutes: 0,
          lateReason: body.lateReason || null,
          hoursWorked: null, needsReview: false,
          clockInLat: geo.pos?.lat ?? null, clockInLng: geo.pos?.lng ?? null,
          withinGeofence: geo.withinGeofence,
          clockInAddress: body.clockInAddress ?? null,
          clockInSelfieUrl: geo.requiresSelfie ? body.clockInSelfieUrl : null,
          clockOutLat: null, clockOutLng: null, withinGeofenceOut: null,
          clockOutAddress: null, clockOutSelfieUrl: null,
          distanceFromOfficeMeters: geo.distanceMeters,
          locationApprovalStatus: geo.requiresSelfie ? "pending" : null,
          locationApprovedBy: null, locationApprovedAt: null,
          notes: null,
          createdBy: caller.uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { id: ref.id };
      });
      return NextResponse.json({ id: record.id, date, clockIn: time, pendingApproval: geo.requiresSelfie, distanceMeters: geo.distanceMeters });
    }

    // type === "out"
    if (!body.recordId) return NextResponse.json({ error: "Missing recordId" }, { status: 400 });
    const ref = collection.doc(body.recordId);

    const preSnap = await ref.get();
    if (!preSnap.exists) return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    const preData = preSnap.data()!;
    if (preData.employeeId !== body.employeeId) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    if (preData.clockOut) return NextResponse.json({ error: "You've already checked out today" }, { status: 409 });

    let office: DocumentData | null = null;
    const officeId = preData.officeId ?? employee.officeId ?? null;
    if (officeId) {
      const officeSnap = await adminDb.collection(FIRESTORE_COLLECTIONS.OFFICES).doc(officeId).get();
      if (officeSnap.exists) office = officeSnap.data()!;
    }

    const geo = evaluateGeofence(body.clockOutLat, body.clockOutLng, office);
    const accuracy = typeof body.clockOutAccuracy === "number" ? body.clockOutAccuracy : null;

    if (geo.requiresSelfie && !selfieBelongsToEmployee(body.clockOutSelfieUrl, body.employeeId)) {
      return NextResponse.json({ error: "A selfie is required to check out from outside the office." }, { status: 400 });
    }

    if (geo.pos) {
      const blocked = await checkAndBlockSuspicious(adminDb, {
        employeeId: body.employeeId, employeeName: employee.fullName, officeId,
        officeName: office?.name ?? "", action: "check_out", pos: geo.pos, accuracy, today: date, createdBy: caller.uid,
      });
      if (blocked) return NextResponse.json({ error: SUSPICIOUS_BLOCK_MESSAGE }, { status: 403 });
    }

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
        clockOutLat: geo.pos?.lat ?? null, clockOutLng: geo.pos?.lng ?? null,
        withinGeofenceOut: geo.withinGeofence,
        clockOutAddress: body.clockOutAddress ?? null,
        clockOutSelfieUrl: geo.requiresSelfie ? body.clockOutSelfieUrl : null,
        distanceFromOfficeMeters: geo.requiresSelfie ? geo.distanceMeters : data.distanceFromOfficeMeters,
        locationApprovalStatus: geo.requiresSelfie ? "pending" : data.locationApprovalStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { hoursWorked };
    });
    return NextResponse.json({ clockOut: time, hoursWorked: result.hoursWorked, pendingApproval: geo.requiresSelfie, distanceMeters: geo.distanceMeters });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to record attendance";
    if (message === "ALREADY_CLOCKED_IN") return NextResponse.json({ error: "Attendance already marked for this employee on this date" }, { status: 409 });
    if (message === "ALREADY_CLOCKED_OUT") return NextResponse.json({ error: "You've already checked out today" }, { status: 409 });
    if (message === "NOT_FOUND") return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
