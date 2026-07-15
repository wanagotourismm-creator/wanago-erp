import { where, type QueryConstraint } from "firebase/firestore";
import { customerRepository } from "@/modules/customers/services/customer.repository";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { cached, invalidateCache } from "@/lib/firebase/data-cache";
import type { Customer, CustomerFormData } from "@/modules/customers/types";

// Random 8-char code, not checked for uniqueness against existing customers
// — kept here (rather than importing from the referrals module) to avoid a
// circular import, since referral.service.ts itself imports fetchCustomers
// from this file. At this scale (a handful of customers created per day)
// the collision odds on a 36^8 keyspace are negligible.
function generateReferralCode(): string {
  return `REF${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// Note: sorted client-side (not via Firestore orderBy) so filtered
// queries only need single-field indexes, which Firestore creates
// automatically — no manual composite index deployment required.
//
// Cached (60s, per filter combination) — fetched in full on Bookings/
// Invoices/Customers pages for bulk-import row resolution and customer
// segmentation, so it's re-run on nearly every visit to those pages.
// See data-cache.ts.
export async function fetchCustomers(filters?: {
  customerType?: string;
  officeId?:     string;
}): Promise<Customer[]> {
  return cached(`customers:${JSON.stringify(filters ?? {})}`, 60_000, async () => {
    const constraints: QueryConstraint[] = [];
    if (filters?.customerType) constraints.push(where("customerType", "==", filters.customerType));
    if (filters?.officeId)     constraints.push(where("officeId",     "==", filters.officeId));
    const customers = await customerRepository.findMany({ constraints });
    return customers.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
  });
}

export async function fetchCustomerById(id: string): Promise<Customer | null> {
  return customerRepository.findById(id);
}

export async function createCustomer(
  data: CustomerFormData,
  createdBy: string
): Promise<Customer> {
  const refNumber = await nextRefNumber("CUSTOMER");

  const customer = await customerRepository.create({
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
    referralCode:         generateReferralCode(),
    referredByCustomerId: data.referredByCustomerId ?? null,
  });
  invalidateCache("customers:");
  return customer;
}

export async function updateCustomer(
  id: string,
  data: Partial<CustomerFormData>
): Promise<void> {
  await customerRepository.update(id, data as Partial<Customer>);
  invalidateCache("customers:");
}

export async function deleteCustomer(id: string): Promise<void> {
  await customerRepository.delete(id);
  invalidateCache("customers:");
}
