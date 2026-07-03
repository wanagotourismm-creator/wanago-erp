import { where, orderBy } from "firebase/firestore";
import { leadRepository } from "@/modules/leads/services/lead.repository";
import { FIRESTORE_COLLECTIONS, REF_FORMATS } from "@/lib/constants";
import { generateRefNumber } from "@/lib/utils/helpers";
import type { Lead, LeadFormData } from "@/modules/leads/types";
import {
  collection, getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export async function fetchLeads(filters?: {
  stage?: string;
  assignedTo?: string;
  officeId?: string;
}): Promise<Lead[]> {
  const constraints = [orderBy("createdAt", "desc")];
  if (filters?.stage)      constraints.unshift(where("stage",      "==", filters.stage));
  if (filters?.assignedTo) constraints.unshift(where("assignedTo", "==", filters.assignedTo));
  if (filters?.officeId)   constraints.unshift(where("officeId",   "==", filters.officeId));
  return leadRepository.findMany({ constraints });
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
