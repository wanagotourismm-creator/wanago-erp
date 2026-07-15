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

// admin/super_admin/hr — the set of roles that can already manage employee
// records via the HRMS Employees page (see PAGE_ACCESS in src/lib/rbac.ts).
// Used to gate server-triggered actions tied to that same page (welcome
// email, new-hire announcement) with the same real permission boundary.
export async function requireHrOrAdmin(idToken: string | null): Promise<{ uid: string } | null> {
  return verifyRole(idToken, ["admin", "super_admin", "hr"]);
}

// admin/super_admin/finance — for read-only financial reports Finance
// needs alongside Admin (e.g. the Customer Retention report), matching how
// firestore.rules already treats Finance as a peer of Admin on financial
// collections (payments/invoices finance_approve, reports:export).
export async function requireAdminOrFinance(idToken: string | null): Promise<{ uid: string } | null> {
  return verifyRole(idToken, ["admin", "super_admin", "finance"]);
}

// admin/super_admin/operations/sales — mirrors the itineraryBrochures
// firestore.rules write grant, so the PDF generation route enforces the
// same boundary as direct Firestore writes to that collection.
export async function requireOperationsOrSales(idToken: string | null): Promise<{ uid: string } | null> {
  return verifyRole(idToken, ["admin", "super_admin", "operations", "sales"]);
}

// Verifies the caller is a signed-in, active user — no role restriction.
// Used to gate API routes that any authenticated staff member can
// legitimately trigger (sending a notification email/WhatsApp, a leave
// decision, a quotation email), where the only thing that needs checking
// server-side is "this is a real logged-in account," not a specific role.
export async function requireAuth(idToken: string | null): Promise<{ uid: string } | null> {
  if (!idToken) return null;
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.isActive === false) return null;
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

// Reads a verified caller's systemRole after requireAuth() has already
// confirmed they're a real, active account — kept separate rather than
// folded into requireAuth() so routes that only need "is this a real user"
// don't pay for a role they don't use, while the AI assistant (which needs
// the role to gate write-tool proposals) can fetch it in one extra read.
export async function getUserRole(uid: string): Promise<string | null> {
  const adminDb = getAdminDb();
  if (!adminDb) return null;
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    return (userDoc.data()?.systemRole as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export type PortalCaller = { portalType: "customer" | "partner"; entityId: string };

// Verifies a Customer/Freelance-Referral-Executive portal session — these
// aren't staff (no `users/{uid}` doc, requireAuth() above would reject
// them), they're signed in via a Firebase custom token minted by
// /api/portal/login for a synthetic uid ("cust_{customerId}" /
// "partner_{partnerId}"). The uid itself is the only claim trusted; every
// portal API route uses the returned entityId to scope reads/writes to
// exactly that one customer/partner's own data, never anyone else's.
export async function requirePortalAuth(idToken: string | null): Promise<PortalCaller | null> {
  if (!idToken) return null;
  const adminAuth = getAdminAuth();
  if (!adminAuth) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.uid.startsWith("cust_")) return { portalType: "customer", entityId: decoded.uid.slice(5) };
    if (decoded.uid.startsWith("partner_")) return { portalType: "partner", entityId: decoded.uid.slice(8) };
    return null;
  } catch {
    return null;
  }
}
