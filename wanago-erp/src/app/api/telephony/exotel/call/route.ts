import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, requireAuth } from "@/lib/firebase/admin";
import { getIntegrationSecret, getIntegrationFlag } from "@/lib/get-integration-secret";
import { toE164Phone } from "@/lib/utils/helpers";
import { getAppUrl } from "@/lib/app-url";
import { FIRESTORE_COLLECTIONS, REF_FORMATS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
}

type Body = {
  leadId:      string | null;
  customerId:  string | null;
  contactName: string;
  phone:       string;
};

// Same transaction-against-a-counter-doc pattern as nextRefNumber()
// (src/lib/firebase/ref-counter.ts) — that helper is client-SDK-only
// (firebase/firestore), this route runs server-side via the Admin SDK, so
// it re-implements the same atomic-increment shape against the identical
// refCounters/{prefix} doc rather than introducing a second counter series.
async function nextCallRefNumber(): Promise<string> {
  const db = getAdminDb()!;
  const prefix = REF_FORMATS.CALL;
  const counterRef = db.collection("refCounters").doc(prefix);
  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? (snap.data()!.next as number) : 1001;
    tx.set(counterRef, { next: current + 1 });
    return current;
  });
  return `${prefix}-${next}`;
}

// Places a click-to-call bridge: Exotel rings the agent's own phone first,
// then connects the lead/customer once picked up — the "classic" Voice v1
// Connect Two Numbers API (not the newer v2/v3 "co-worker device" model,
// which needs a separate softphone/app registration this feature doesn't
// require). See the Lead Engine/Command Center session's plan file for the
// sourced API shape this was built against.
export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });

  const enabled = await getIntegrationFlag("callingEnabled");
  if (!enabled) {
    return NextResponse.json({ error: "Voice calling isn't enabled. Turn it on in Admin → Integrations once configured." }, { status: 501 });
  }

  const [accountSid, apiKey, apiToken, callerId, webhookToken] = await Promise.all([
    getIntegrationSecret("callingAccountSid"),
    getIntegrationSecret("callingApiKey"),
    getIntegrationSecret("callingApiToken"),
    getIntegrationSecret("callingCallerId"),
    getIntegrationSecret("callingWebhookToken"),
  ]);
  if (!accountSid || !apiKey || !apiToken || !callerId || !webhookToken) {
    return NextResponse.json({ error: "Voice calling is enabled but not fully configured — check Admin → Integrations." }, { status: 501 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.phone || (!body.leadId && !body.customerId)) {
    return NextResponse.json({ error: "Missing lead/customer phone details" }, { status: 400 });
  }

  // Resolve the calling agent's own phone (the number Exotel rings first)
  // and identity for the CallLog — same users/{uid}.employeeId ->
  // hrmsEmployees/{id} linkage /api/hrms/attendance/clock/route.ts already
  // trusts, rather than accepting an employeeId claim from the client.
  const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(caller.uid).get();
  const employeeId = userDoc.data()?.employeeId as string | undefined;
  if (!employeeId) return NextResponse.json({ error: "This login isn't linked to an employee record." }, { status: 403 });

  const employeeSnap = await db.collection(FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES).doc(employeeId).get();
  const employee = employeeSnap.data();
  if (!employee?.mobileNumber) {
    return NextResponse.json({ error: "Your employee record has no mobile number on file — add one to use Call via App." }, { status: 400 });
  }

  const from = toE164Phone(employee.mobileNumber);
  const to = toE164Phone(body.phone);
  const statusCallbackUrl = `${getAppUrl()}/api/telephony/exotel/callback?token=${encodeURIComponent(webhookToken)}`;

  let exotelCallSid: string;
  try {
    const exotelRes = await fetch(
      `https://api.exotel.com/v1/Accounts/${accountSid}/Calls/connect.json`,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${Buffer.from(`${apiKey}:${apiToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          From: from, To: to, CallerId: callerId,
          Record: "true",
          StatusCallback: statusCallbackUrl,
        }).toString(),
      }
    );
    if (!exotelRes.ok) {
      const text = await exotelRes.text().catch(() => "");
      return NextResponse.json({ error: `Exotel couldn't place the call: ${text || exotelRes.statusText}` }, { status: 502 });
    }
    const data = await exotelRes.json().catch(() => ({}));
    // Exotel's response nests the call details — defensively check a
    // couple of likely shapes rather than assuming one, since this hasn't
    // been verified against a live account yet.
    exotelCallSid = data?.Call?.Sid ?? data?.Sid ?? data?.CallSid;
    if (!exotelCallSid) {
      return NextResponse.json({ error: "Exotel accepted the request but didn't return a call ID — check the Voice Calling setup." }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Couldn't reach Exotel. Try again shortly." }, { status: 502 });
  }

  const refNumber = await nextCallRefNumber();
  const callLogRef = db.collection(FIRESTORE_COLLECTIONS.CALL_LOGS).doc();
  await callLogRef.set({
    leadId: body.leadId ?? null,
    customerId: body.customerId ?? null,
    contactName: body.contactName,
    phone: body.phone,
    callMethod: "phone",
    direction: "outbound",
    outcome: "in_progress",
    durationMinutes: null,
    notes: null,
    loggedBy: employeeId,
    loggedByName: employee.fullName ?? "Unknown",
    followUpNeeded: false,
    followUpDate: null,
    recordingFileUrl: null,
    recordingUrl: null,
    externalCallSid: exotelCallSid,
    refNumber,
    status: "logged",
    createdBy: caller.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ callLogId: callLogRef.id });
}
