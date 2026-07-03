import { orderBy } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Employee } from "@/modules/hrms/shared/types";

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
