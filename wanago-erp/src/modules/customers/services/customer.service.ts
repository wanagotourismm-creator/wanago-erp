import { where, type QueryConstraint } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { customerRepository } from "@/modules/customers/services/customer.repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { generateRefNumber, toDate } from "@/lib/utils/helpers";
import type { Customer, CustomerFormData } from "@/modules/customers/types";

// Note: sorted client-side (not via Firestore orderBy) so filtered
// queries only need single-field indexes, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchCustomers(filters?: {
  customerType?: string;
  officeId?:     string;
}): Promise<Customer[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.customerType) constraints.push(where("customerType", "==", filters.customerType));
  if (filters?.officeId)     constraints.push(where("officeId",     "==", filters.officeId));
  const customers = await customerRepository.findMany({ constraints });
  return customers.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchCustomerById(id: string): Promise<Customer | null> {
  return customerRepository.findById(id);
}

export async function createCustomer(
  data: CustomerFormData,
  createdBy: string
): Promise<Customer> {
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.CUSTOMERS));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("CUSTOMER", ids);

  return customerRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:         "active",
    email:          data.email          || null,
    alternatePhone: data.alternatePhone || null,
    city:           data.city           || null,
    address:        data.address        || null,
    assignedTo:     data.assignedTo     || null,
    agentName:      data.agentName      || null,
    notes:          data.notes          || null,
  });
}

export async function updateCustomer(
  id: string,
  data: Partial<CustomerFormData>
): Promise<void> {
  return customerRepository.update(id, data as Partial<Customer>);
}

export async function deleteCustomer(id: string): Promise<void> {
  return customerRepository.delete(id);
}
