import { orderBy } from "firebase/firestore";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { generateRefNumber } from "@/lib/utils/helpers";
import type { Supplier, SupplierFormData } from "@/modules/suppliers/types";

class SupplierRepository extends BaseRepository<Supplier> {
  constructor() { super(FIRESTORE_COLLECTIONS.SUPPLIERS); }
}
const repo = new SupplierRepository();

export async function fetchSuppliers(): Promise<Supplier[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}

export async function createSupplier(data: SupplierFormData, createdBy: string): Promise<Supplier> {
  const existing  = await getDocs(collection(db, FIRESTORE_COLLECTIONS.SUPPLIERS));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = "SUP-" + String(1001 + existing.size);

  return repo.create({
    ...data, refNumber, createdBy, status: "active",
    contactName:   data.contactName   || null,
    email:         data.email         || null,
    website:       data.website       || null,
    city:          data.city          || null,
    address:       data.address       || null,
    gstNumber:     data.gstNumber     || null,
    panNumber:     data.panNumber     || null,
    bankName:      data.bankName      || null,
    accountNumber: data.accountNumber || null,
    ifscCode:      data.ifscCode      || null,
    notes:         data.notes         || null,
    tags:          data.tags          || [],
  });
}

export async function updateSupplier(id: string, data: Partial<SupplierFormData>): Promise<void> {
  return repo.update(id, data as Partial<Supplier>);
}

export async function deleteSupplier(id: string): Promise<void> {
  return repo.delete(id);
}
