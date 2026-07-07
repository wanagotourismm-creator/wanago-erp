import { orderBy, where } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { generateRefNumber } from "@/lib/utils/helpers";
import type { Employee, EmployeeDocument } from "@/modules/hrms/shared/types";
import type { EmployeeFormData } from "@/modules/hrms/employees/types";

class EmployeeRepository extends BaseRepository<Employee> {
  constructor() { super(FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES); }
}
const repo = new EmployeeRepository();

export async function fetchEmployees(): Promise<Employee[]> {
  return repo.findMany({ constraints: [orderBy("fullName", "asc")] });
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
      return { ...match, userId: uid };
    }
  }
  return null;
}

export async function createEmployee(
  data: EmployeeFormData,
  createdBy: string
): Promise<Employee> {
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES));
  const ids           = existing.docs.map(d => d.data().employeeCode ?? "");
  const employeeCode  = generateRefNumber("EMPLOYEE", ids);

  return repo.create({
    ...data,
    employeeCode,
    createdBy,
    status:             "active",
    profilePictureUrl:  null,
    reportingManagerName: data.reportingManagerName ?? null,
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
}

export async function updateEmployee(
  id: string,
  data: Partial<EmployeeFormData>
): Promise<void> {
  const patch: Partial<Employee> = { ...data };
  if (data.userId !== undefined) patch.userId = data.userId || null;
  return repo.update(id, patch);
}

export async function deleteEmployee(id: string): Promise<void> {
  return repo.delete(id);
}

export async function uploadProfilePicture(employeeId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `employees/${employeeId}/profile-${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await repo.update(employeeId, { profilePictureUrl: url } as Partial<Employee>);
  return url;
}

export async function uploadEmployeeDocument(
  employeeId: string,
  label: string,
  file: File,
  existingDocuments: EmployeeDocument[]
): Promise<EmployeeDocument[]> {
  const storageRef = ref(storage, `employees/${employeeId}/documents/${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

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
