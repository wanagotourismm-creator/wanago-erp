import { getApps, initializeApp, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore,  type Firestore  } from "firebase/firestore";
import { getAuth,       type Auth        } from "firebase/auth";
import { getStorage,    type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Singleton — safe for Next.js hot-reload
function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

export const firebaseApp: FirebaseApp    = getFirebaseApp();
export const db:          Firestore      = getFirestore(firebaseApp);
export const auth:        Auth           = getAuth(firebaseApp);
export const storage:     FirebaseStorage = getStorage(firebaseApp);

// Secondary app instance — lets an admin create a new user account
// (signUp) without Firebase Auth swapping out and signing them into
// the newly created account on the primary app.
function getSecondaryFirebaseApp(): FirebaseApp {
  const existing = getApps().find(a => a.name === "Secondary");
  if (existing) return existing;
  return initializeApp(firebaseConfig, "Secondary");
}

export const secondaryAuth: Auth = getAuth(getSecondaryFirebaseApp());
