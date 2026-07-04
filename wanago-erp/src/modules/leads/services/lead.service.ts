import { where, type QueryConstraint } from "firebase/firestore";
import { leadRepository } from "@/modules/leads/services/lead.repository";
import { FIRESTORE_COLLECTIONS, REF_FORMATS } from "@/lib/constants";
import { generateRefNumber, toDate } from "@/lib/utils/helpers";
import type { Lead, LeadFormData } from "@/modules/leads/types";
import {
  collection, getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { fetchCustomers, createCustomer } from "@/modules/customers/services/customer.service";

// Note: sorted client-side (not via Firestore orderBy) so filtered
// queries only need single-field indexes, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchLeads(filters?: {
  stage?: string;
  assignedTo?: string;
  officeId?: string;
}): Promise<Lead[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.stage)      constraints.push(where("stage",      "==", filters.stage));
  if (filters?.assignedTo) constraints.push(where("assignedTo", "==", filters.assignedTo));
  if (filters?.officeId)   constraints.push(where("officeId",   "==", filters.officeId));
  const leads = await leadRepository.findMany({ constraints });
  return leads.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchLeadById(id: string): Promise<Lead | null> {
  return leadRepository.findById(id);
}

export async function createLead(
  data: LeadFormData,
  createdBy: string
): Promise<Lead> {
  // Generate ref number
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.LEADS));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("LEAD", ids);

  return leadRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:          "active",
    lastContactedAt: null,
    email:           data.email || null,
    alternatePhone:  data.alternatePhone || null,
    notes:           data.notes || null,
    assignedTo:      data.assignedTo || null,
    agentName:       data.agentName || null,
  });
}

export async function updateLead(
  id: string,
  data: Partial<LeadFormData>
): Promise<void> {
  return leadRepository.update(id, data as Partial<Lead>);
}

export async function updateLeadStage(
  id: string,
  stage: string
): Promise<void> {
  return leadRepository.update(id, { stage } as Partial<Lead>);
}

export async function deleteLead(id: string): Promise<void> {
  return leadRepository.delete(id);
}

/**
 * Called whenever a lead is marked "won" — creates a matching Customer
 * record if one doesn't already exist for that phone number.
 */
export async function convertLeadToCustomer(lead: Lead, createdBy: string): Promise<void> {
  const existingCustomers = await fetchCustomers();
  const alreadyExists = existingCustomers.some(c => c.phone === lead.phone);
  if (alreadyExists) return;

  await createCustomer({
    fullName:       lead.name,
    email:          lead.email,
    phone:          lead.phone,
    alternatePhone: lead.alternatePhone,
    customerType:   "individual",
    city:           null,
    address:        null,
    source:         "Converted Lead",
    officeId:       lead.officeId,
    officeName:     lead.officeName,
    notes:          `Converted from lead ${lead.refNumber} (${lead.destination})`,
    createdBy,
  }, createdBy);
}
