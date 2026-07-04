import {
  createUserWithEmailAndPassword, signOut as signOutSecondary,
} from "firebase/auth";
import {
  collection, doc, getDocs, updateDoc, orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { db, secondaryAuth } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { createUserProfile } from "@/modules/auth/services/auth.service";
import type { UserProfile } from "@/modules/auth/types";

export async function fetchUsers(): Promise<UserProfile[]> {
  const q = query(collection(db, FIRESTORE_COLLECTIONS.USERS), orderBy("displayName", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as UserProfile);
}

export type NewUserInput = {
  email:       string;
  password:    string;
  displayName: string;
  phone:       string | null;
  systemRole:  UserProfile["systemRole"];
  teamRole:    UserProfile["teamRole"];
  officeId:    string;
  officeName:  string;
  department:  string;
};

export async function createUserAccount(
  data: NewUserInput,
  createdBy: string
): Promise<void> {
  // Create the Auth account on the SECONDARY app so the admin's own
  // session on the primary app is untouched.
  const credential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
  const uid = credential.user.uid;

  await createUserProfile(uid, {
    uid,
    email:       data.email,
    displayName: data.displayName,
    photoURL:    null,
    phone:       data.phone,
    systemRole:  data.systemRole,
    teamRole:    data.teamRole,
    officeId:    data.officeId,
    officeName:  data.officeName,
    department:  data.department,
    isActive:    true,
    createdBy,
    status:      "active",
  });

  // Sign the newly-created user back out of the secondary app instance.
  await signOutSecondary(secondaryAuth);
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, "systemRole" | "teamRole" | "officeId" | "officeName" | "department" | "isActive" | "displayName" | "phone">>
): Promise<void> {
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
