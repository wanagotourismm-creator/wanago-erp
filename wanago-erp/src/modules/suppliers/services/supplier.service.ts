import { where, type QueryConstraint } from "firebase/firestore";
import { supplierRepository } from "@/modules/suppliers/services/supplier.repository";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import type { Supplier, SupplierFormData } from "@/modules/suppliers/types";

// Note: sorted client-side (not via Firestore orderBy) so filtered
// queries only need single-field indexes, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchSuppliers(filters?: {
  category?: string;
  officeId?: string;
}): Promise<Supplier[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.category) constraints.push(where("category", "==", filters.category));
  if (filters?.officeId) constraints.push(where("officeId", "==", filters.officeId));
  const suppliers = await supplierRepository.findMany({ constraints });
  return suppliers.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchSupplierById(id: string): Promise<Supplier | null> {
  return supplierRepository.findById(id);
}

export async function createSupplier(
  data: SupplierFormData,
  createdBy: string
): Promise<Supplier> {
  const refNumber = await nextRefNumber("SUPPLIER");

  return supplierRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:         "active",
    email:          data.email        || null,
    address:        data.address      || null,
    city:           data.city         || null,
    gstNumber:      data.gstNumber    || null,
    paymentTerms:   data.paymentTerms || null,
    notes:          data.notes        || null,
    supplierStatus: data.supplierStatus || "active",
  });
}

export async function updateSupplier(
  id: string,
  data: Partial<SupplierFormData>
): Promise<void> {
  return supplierRepository.update(id, data as Partial<Supplier>);
}

export async function deleteSupplier(id: string): Promise<void> {
  return supplierRepository.delete(id);
}
