import { orderBy, where } from "firebase/firestore";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { customerRepository } from "@/modules/customers/services/customer.repository";
import { FIRESTORE_COLLECTIONS, REF_FORMATS } from "@/lib/constants";
import { generateRefNumber } from "@/lib/utils/helpers";
import type { Customer, CustomerFormData } from "@/modules/customers/types";

export async function fetchCustomers(): Promise<Customer[]> {
  return customerRepository.findMany({
    constraints: [orderBy("createdAt", "desc")],
  });
}

export async function fetchCustomerById(id: string): Promise<Customer | null> {
  return customerRepository.findById(id);
}

export async function createCustomer(
  data: CustomerFormData,
  createdBy: string
): Promise<Customer> {
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.CUSTOMERS));
  const ids      = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("BOOKING", ids).replace("WGO", "CUS");

  return customerRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:          "active",
    totalBookings:   0,
    totalRevenue:    0,
    lastBookingDate: null,
    email:           data.email           || null,
    alternatePhone:  data.alternatePhone  || null,
    dateOfBirth:     data.dateOfBirth     || null,
    anniversary:     data.anniversary     || null,
    city:            data.city            || null,
    state:           data.state           || null,
    pincode:         data.pincode         || null,
    assignedTo:      data.assignedTo      || null,
    agentName:       data.agentName       || null,
    source:          data.source          || null,
    notes:           data.notes           || null,
    tags:            data.tags            || [],
    gender:          data.gender          || null,
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
