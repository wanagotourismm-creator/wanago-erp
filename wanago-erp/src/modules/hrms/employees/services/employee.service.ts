import { orderBy, where } from "firebase/firestore";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Employee } from "@/modules/hrms/shared/types";
import type { EmployeeSchema } from "@/modules/hrms/employees/schemas";

class EmployeeRepository extends BaseRepository<Employee> {
  constructor() { super(FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES); }
}
const repo = new EmployeeRepository();

async function generateEmployeeId(): Promise<string> {
  const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES));
  return `EMP-${String(1001 + snap.size).padStart(4, "0")}`;
}

export async function fetchEmployees(): Promise<Employee[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}

export async function fetchEmployeeById(id: string): Promise<Employee | null> {
  return repo.findById(id);
}

export async function createEmployee(data: EmployeeSchema, createdBy: string): Promise<Employee> {
  const employeeId = await generateEmployeeId();
  return repo.create({
    ...data,
    employeeId,
    createdBy,
    status:          "active",
    photoURL:        null,
    gender:          data.gender          || null,
    dateOfBirth:     data.dateOfBirth     || null,
    address:         data.address         || null,
    city:            data.city            || null,
    state:           data.state           || null,
    reportingManager:data.reportingManager|| null,
    userId:          data.userId          || null,
    uan:             data.uan             || null,
    pfNumber:        data.pfNumber        || null,
    panNumber:       data.panNumber       || null,
    bankName:        data.bankName        || null,
    accountNumber:   data.accountNumber   || null,
    ifscCode:        data.ifscCode        || null,
    notes:           data.notes           || null,
  });
}

export async function updateEmployee(id: string, data: Partial<EmployeeSchema>): Promise<void> {
  return repo.update(id, data as Partial<Employee>);
}

export async function deleteEmployee(id: string): Promise<void> {
  return repo.delete(id);
}
