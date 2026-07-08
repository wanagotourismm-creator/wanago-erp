import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

let app: App | null = null;

// Lazy singleton — returns null (never throws) if FIREBASE_SERVICE_ACCOUNT_KEY
// isn't set, so callers can fall back gracefully instead of crashing the route.
function getAdminApp(): App | null {
  if (app) return app;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    const existing = getApps().find((a) => a.name === "admin");
    app = existing ?? initializeApp({ credential: cert(JSON.parse(raw)) }, "admin");
    return app;
  } catch {
    return null;
  }
}

export function getAdminDb(): Firestore | null {
  const a = getAdminApp();
  return a ? getFirestore(a) : null;
}

export function getAdminAuth(): Auth | null {
  const a = getAdminApp();
  return a ? getAuth(a) : null;
}

// Server-side Storage access (bypasses Storage security rules entirely,
// same as getAdminDb() does for Firestore) — used for writes that need to
// happen outside any user's own request context, like caching generated
// TTS audio once for every employee to reuse.
export function getAdminStorage() {
  const a = getAdminApp();
  if (!a) return null;
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return bucketName ? getStorage(a).bucket(bucketName) : getStorage(a).bucket();
}

async function verifyRole(idToken: string | null, allowedRoles: string[]): Promise<{ uid: string } | null> {
  if (!idToken) return null;
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const role = userDoc.data()?.systemRole;
    if (!role || !allowedRoles.includes(role)) return null;
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

// Verifies a Firebase ID token and checks the caller is admin/super_admin.
// Used to gate the Integrations API — the one endpoint that can set/rotate
// third-party API keys, so it needs real server-side identity verification
// rather than the client-supplied-context trust the rest of this app uses.
export async function requireAdmin(idToken: string | null): Promise<{ uid: string } | null> {
  return verifyRole(idToken, ["admin", "super_admin"]);
}

// Stricter than requireAdmin — for actions only a super_admin should take,
// like permanently deleting a user's login account.
export async function requireSuperAdmin(idToken: string | null): Promise<{ uid: string } | null> {
  return verifyRole(idToken, ["super_admin"]);
}
