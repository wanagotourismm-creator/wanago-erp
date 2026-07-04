import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { PERMISSION_MAP } from "@/lib/rbac";
import type { PermissionMap } from "@/types/rbac";

const DOC_ID = "rolePermissions";

export async function fetchRolePermissions(): Promise<PermissionMap> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID));
  if (!snap.exists()) return PERMISSION_MAP;
  const data = snap.data();
  return { ...PERMISSION_MAP, ...(data.roles ?? {}) } as PermissionMap;
}

export async function saveRolePermissions(
  map: PermissionMap,
  updatedBy: string
): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID), {
    roles:     map,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}
