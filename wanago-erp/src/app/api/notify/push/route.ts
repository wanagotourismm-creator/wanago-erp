import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminMessaging, requireAuth } from "@/lib/firebase/admin";
import { isRateLimited } from "@/lib/server/rate-limit";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (isRateLimited(`notify-push:${caller.uid}`, 60_000, 30)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let payload: { userId?: string; title?: string; body?: string; link?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!payload.userId || !payload.title || !payload.body) {
    return NextResponse.json({ error: "Missing userId/title/body" }, { status: 400 });
  }

  const db = getAdminDb();
  const messaging = getAdminMessaging();
  // Push is best-effort on top of the in-app notification — a misconfigured
  // Admin SDK or missing FCM setup should never surface as a caller-facing
  // error, it just means no push goes out for this device.
  if (!db || !messaging) return NextResponse.json({ ok: true, sent: 0 });

  const userSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(payload.userId).get();
  const tokens: string[] = userSnap.data()?.fcmTokens ?? [];
  if (tokens.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const result = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    webpush: payload.link ? { fcmOptions: { link: payload.link } } : undefined,
  });

  // Prune tokens the browser/OS has invalidated (uninstalled, permission
  // revoked, etc.) so the array doesn't grow stale forever.
  const deadTokens = result.responses
    .map((r, i) => (!r.success && r.error?.code === "messaging/registration-token-not-registered" ? tokens[i] : null))
    .filter((t): t is string => t !== null);
  if (deadTokens.length > 0) {
    await userSnap.ref.update({ fcmTokens: tokens.filter((t) => !deadTokens.includes(t)) });
  }

  return NextResponse.json({ ok: true, sent: result.successCount });
}
