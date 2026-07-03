import { where, orderBy } from "firebase/firestore";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { leadRepository } from "@/modules/leads/services/lead.repository";
import { FIRESTORE_COLLECTIONS, REF_FORMATS, LEAD_STAGES } from "@/lib/constants";
import { generateRefNumber } from "@/lib/utils/helpers";
import type { Lead, LeadFormData } from "@/modules/leads/types";
import { createCustomer } from "@/modules/customers/services/customer.service";

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
  const existing  = await getDocs(collection(db, FIRESTORE_COLLECTIONS.LEADS));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("LEAD", ids);

  return leadRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:          "active",
    lastContactedAt: null,
    email:           data.email          || null,
    alternatePhone:  data.alternatePhone || null,
    notes:           data.notes          || null,
    assignedTo:      data.assignedTo     || null,
    agentName:       data.agentName      || null,
  });
}

export async function updateLead(
  id: string,
  data: Partial<LeadFormData>
): Promise<void> {
  return leadRepository.update(id, data as Partial<Lead>);
}

// ── Auto-create customer when lead is marked Won ──────────────
export async function updateLeadStage(
  id: string,
  stage: string,
  lead?: Lead,
  createdBy?: string
): Promise<void> {
  await leadRepository.update(id, { stage } as Partial<Lead>);

  // Auto-create customer if stage is "won"
  if (stage === LEAD_STAGES.WON && lead) {
    try {
      // Check if customer already exists with same phone
      const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.CUSTOMERS));
      const alreadyExists = existing.docs.some(
        d => d.data().phone === lead.phone
      );

      if (!alreadyExists) {
        await createCustomer(
          {
            name:           lead.name,
            phone:          lead.phone,
            email:          lead.email          || null,
            alternatePhone: lead.alternatePhone || null,
            dateOfBirth:    null,
            anniversary:    null,
            gender:         null,
            city:           null,
            state:          null,
            country:        "India",
            pincode:        null,
            officeId:       lead.officeId,
            officeName:     lead.officeName,
            assignedTo:     lead.assignedTo     || null,
            agentName:      lead.agentName      || null,
            source:         lead.source         || null,
            tags:           [],
            notes:          `Auto-created from Lead ${lead.refNumber}. Destination: ${lead.destination}`,
          },
          createdBy ?? "system"
        );
        console.log(`✅ Customer auto-created from lead ${lead.refNumber}`);
      }
    } catch (err) {
      console.error("Failed to auto-create customer:", err);
      // Don't throw — lead stage update already succeeded
    }
  }
}

export async function deleteLead(id: string): Promise<void> {
  return leadRepository.delete(id);
}
