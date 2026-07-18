import { orderBy, where, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { uploadFile } from "@/lib/storage/upload";
import type { Employee, EmployeeDocument } from "@/modules/hrms/shared/types";
import type { EmployeeFormData } from "@/modules/hrms/employees/types";

class EmployeeRepository extends BaseRepository<Employee> {
  constructor() { super(FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES); }
}
const repo = new EmployeeRepository();

// Denormalizes this employee's id onto their linked login account
// (users/{userId}.employeeId) so Firestore security rules — which only
// ever see request.auth.uid, never an Employee.id — can resolve "which
// employee is this request" with one cheap get() when scoping
// leads/customers/bookings reads to assignedTo. Best-effort: a login
// account not existing yet (or the write racing a not-yet-created users
// doc) must never block saving the employee record itself.
async function syncEmployeeIdOnUser(userId: string, employeeId: string): Promise<void> {
  try {
    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId), { employeeId });
  } catch { /* best-effort */ }
}

export async function fetchEmployees(): Promise<Employee[]> {
  return repo.findMany({ constraints: [orderBy("fullName", "asc")] });
}

// One-time migration for accounts linked to an employee before employeeId
// denormalization existed — createEmployee/updateEmployee sync it going
// forward, but an employee whose userId link was set previously and hasn't
// been re-saved since needs this run once. Safe to run repeatedly (it's
// just re-applying the same sync), so no "already migrated" bookkeeping.
export async function backfillEmployeeUserLinks(): Promise<{ synced: number; total: number }> {
  const all = await repo.findMany({});
  const linked = all.filter((e) => e.userId);
  await Promise.all(linked.map((e) => syncEmployeeIdOnUser(e.userId as string, e.id)));
  return { synced: linked.length, total: all.length };
}

export async function fetchEmployeeById(id: string): Promise<Employee | null> {
  return repo.findById(id);
}

// Resolves the logged-in Firebase Auth user to their Employee record. Falls
// back to matching on email for records created before the userId linkage
// existed, and backfills userId onto that record so future lookups are direct.
export async function fetchEmployeeByUserId(uid: string, email?: string | null): Promise<Employee | null> {
  const byUid = await repo.findMany({ constraints: [where("userId", "==", uid)] });
  if (byUid.length > 0) return byUid[0];

  if (email) {
    const byEmail = await repo.findMany({ constraints: [where("email", "==", email)] });
    if (byEmail.length > 0) {
      const match = byEmail[0];
      if (!match.userId) await repo.update(match.id, { userId: uid } as Partial<Employee>);
      syncEmployeeIdOnUser(uid, match.id);
      return { ...match, userId: uid };
    }
  }
  return null;
}

// Best-effort — a failed/unsent welcome email must never block adding the
// employee. Posts to an API route rather than importing notify-server.ts
// directly, since that pulls in firebase-admin (Node-only, can't bundle
// into this client-side service).
async function sendWelcomeEmail(employee: Employee): Promise<void> {
  if (!employee.email) return;
  const idToken = await auth.currentUser?.getIdToken().catch(() => null);
  fetch("/api/hrms/send-welcome-email", {
    method: "POST",
    headers: { "content-type": "application/json", ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify({ to: employee.email, fullName: employee.fullName, designation: employee.designation }),
  }).catch(() => {});
}

// Best-effort — tells the rest of the team about the new hire (in-app +
// email, one per teammate). Never blocks employee creation if it fails.
async function announceNewHire(employee: Employee): Promise<void> {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null);
  fetch("/api/hrms/announce-new-hire", {
    method: "POST",
    headers: { "content-type": "application/json", ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify({ employeeId: employee.id, fullName: employee.fullName, designation: employee.designation }),
  }).catch(() => {});
}

export async function createEmployee(
  data: EmployeeFormData,
  createdBy: string
): Promise<Employee> {
  const employeeCode = await nextRefNumber("EMPLOYEE");

  const employee = await repo.create({
    ...data,
    employeeCode,
    createdBy,
    status:             "active",
    profilePictureUrl:  null,
    reportingManagerName: data.reportingManagerName ?? null,
    functionalManagerId: data.functionalManagerId || null,
    functionalManagerName: data.functionalManagerName ?? null,
    documents:          [],
    gender:             data.gender || null,
    dateOfBirth:        data.dateOfBirth || null,
    email:              data.email || null,
    address:            data.address || null,
    reportingManagerId: data.reportingManagerId || null,
    dateOfJoining:      data.dateOfJoining || null,
    bankAccountNumber:  data.bankAccountNumber || null,
    bankName:           data.bankName || null,
    ifscCode:           data.ifscCode || null,
    uan:                data.uan || null,
    pfNumber:           data.pfNumber || null,
    panNumber:          data.panNumber || null,
    monthlyProfitTarget: data.monthlyProfitTarget ?? null,
    userId:             data.userId || null,
  });

  sendWelcomeEmail(employee);
  announceNewHire(employee);
  if (employee.userId) syncEmployeeIdOnUser(employee.userId, employee.id);
  return employee;
}

// Keeps the linked login account's profile fields (name/phone/department/
// office) in step with the employee record via a dedicated server route —
// firestore.rules only lets an isAdmin() caller or the account's own owner
// write to users/{uid}, so an HR-role edit couldn't otherwise reach it.
// Best-effort: a failed sync must never block the employee save itself.
async function syncEmployeeFieldsToUser(
  uid: string, data: Partial<EmployeeFormData>, customPageAccess?: string[] | null
): Promise<void> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    await fetch("/api/hrms/employees/sync-linked-user", {
      method: "POST",
      headers: { "content-type": "application/json", ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
      body: JSON.stringify({
        uid,
        displayName: data.fullName,
        phone: data.mobileNumber ?? null,
        department: data.department,
        officeId: data.officeId,
        officeName: data.officeName,
        ...(customPageAccess !== undefined ? { customPageAccess } : {}),
      }),
    });
  } catch { /* best-effort */ }
}

export async function updateEmployee(
  id: string,
  data: Partial<EmployeeFormData>,
  customPageAccess?: string[] | null
): Promise<void> {
  const patch: Partial<Employee> = { ...data };
  if (data.userId !== undefined) patch.userId = data.userId || null;
  await repo.update(id, patch);
  if (data.userId) {
    syncEmployeeIdOnUser(data.userId, id);
    syncEmployeeFieldsToUser(data.userId, data, customPageAccess);
  }
}

// Cascades to the employee's linked login account (if any) via a
// dedicated server route (Admin SDK) — client SDKs can't delete another
// user's Firebase Auth account. Best-effort: a failed cascade must never
// leave the employee record un-deleted, since the employee delete itself
// already succeeded by the time this runs.
async function deleteLinkedUserAccount(uid: string): Promise<void> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    await fetch("/api/hrms/employees/delete-linked-user", {
      method: "POST",
      headers: { "content-type": "application/json", ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
      body: JSON.stringify({ uid }),
    });
  } catch { /* best-effort */ }
}

export async function deleteEmployee(id: string, linkedUserId?: string | null): Promise<void> {
  await repo.delete(id);
  if (linkedUserId) await deleteLinkedUserAccount(linkedUserId);
}

export async function uploadProfilePicture(employeeId: string, file: File): Promise<string> {
  const url = await uploadFile(`employees/${employeeId}/profile-${Date.now()}-${file.name}`, file);
  await repo.update(employeeId, { profilePictureUrl: url } as Partial<Employee>);
  return url;
}

export async function uploadEmployeeDocument(
  employeeId: string,
  label: string,
  file: File,
  existingDocuments: EmployeeDocument[]
): Promise<EmployeeDocument[]> {
  const url = await uploadFile(`employees/${employeeId}/documents/${Date.now()}-${file.name}`, file);

  const newDoc: EmployeeDocument = {
    id:         `${Date.now()}`,
    label,
    url,
    uploadedAt: new Date().toISOString(),
  };
  const documents = [...existingDocuments, newDoc];
  await repo.update(employeeId, { documents } as Partial<Employee>);
  return documents;
}

export async function removeEmployeeDocument(
  employeeId: string,
  documentId: string,
  existingDocuments: EmployeeDocument[]
): Promise<EmployeeDocument[]> {
  const documents = existingDocuments.filter(d => d.id !== documentId);
  await repo.update(employeeId, { documents } as Partial<Employee>);
  return documents;
}
