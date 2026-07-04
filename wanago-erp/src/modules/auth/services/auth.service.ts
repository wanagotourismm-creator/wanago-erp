import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { logActivity } from "@/lib/activity-log";
import type { UserProfile } from "@/modules/auth/types";
import type { AuthUser } from "@/store/auth.store";

// ── Firebase error code → human readable message ─────────────
function parseAuthError(code: string): string {
  const map: Record<string, string> = {
    "auth/user-not-found":       "No account found with this email.",
    "auth/wrong-password":       "Incorrect password. Please try again.",
    "auth/invalid-credential":   "Invalid email or password.",
    "auth/invalid-email":        "Please enter a valid email address.",
    "auth/user-disabled":        "This account has been disabled.",
    "auth/too-many-requests":    "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] ?? "An unexpected error occurred. Please try again.";
}

// ── Sign in ───────────────────────────────────────────────────
export async function signInUser(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await fetchUserProfile(credential.user.uid);

    if (!profile) {
      await signOut(auth);
      return { user: null, error: "Account not found. Contact your administrator." };
    }

    if (!profile.isActive) {
      await signOut(auth);
      return { user: null, error: "Your account is inactive. Contact your administrator." };
    }

    // Update last login
    await updateDoc(
      doc(db, FIRESTORE_COLLECTIONS.USERS, credential.user.uid),
      { lastLoginAt: serverTimestamp() }
    );

    const authUser: AuthUser = {
      uid:         credential.user.uid,
      email:       profile.email,
      displayName: profile.displayName,
      photoURL:    profile.photoURL,
      systemRole:  profile.systemRole,
      teamRole:    profile.teamRole,
      officeId:    profile.officeId,
      officeName:  profile.officeName,
      department:  profile.department,
      isActive:    profile.isActive,
    };

    logActivity({
      entityType: "Login", entityName: profile.displayName, action: "created",
      detail: `${profile.displayName} logged in`,
      actorId: authUser.uid, actorName: profile.displayName,
    });

    return { user: authUser, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? "";
    return { user: null, error: parseAuthError(code) };
  }
}

// ── Sign out ──────────────────────────────────────────────────
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// ── Forgot password ───────────────────────────────────────────
export async function sendResetEmail(
  email: string
): Promise<{ error: string | null }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? "";
    return { error: parseAuthError(code) };
  }
}

// ── Fetch user profile from Firestore ─────────────────────────
export async function fetchUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UserProfile;
}

// ── Create user profile (used by Super Admin) ─────────────────
export async function createUserProfile(
  uid: string,
  data: Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "lastLoginAt">
): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, uid), {
    ...data,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
    lastLoginAt: null,
  });
}

// ── Auth state listener ───────────────────────────────────────
export function onAuthStateChange(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
