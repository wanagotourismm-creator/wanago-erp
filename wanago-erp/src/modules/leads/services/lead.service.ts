import { where, serverTimestamp, type QueryConstraint } from "firebase/firestore";
import { leadRepository } from "@/modules/leads/services/lead.repository";
import { toDate, phoneMatchKey } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import type { Lead, LeadFormData } from "@/modules/leads/types";
import { fetchCustomers, createCustomer, fetchCustomerById } from "@/modules/customers/services/customer.service";
import { fetchQuotations, createQuotation } from "@/modules/quotations/services/quotation.service";
import type { Customer } from "@/modules/customers/types";

// Note: sorted client-side (not via Firestore orderBy) so filtered
// queries only need single-field indexes, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchLeads(filters?: {
  stage?: string;
  assignedTo?: string;
  officeId?: string;
  matchedCustomerId?: string;
}): Promise<Lead[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.stage)             constraints.push(where("stage",             "==", filters.stage));
  if (filters?.assignedTo)        constraints.push(where("assignedTo",        "==", filters.assignedTo));
  if (filters?.officeId)          constraints.push(where("officeId",          "==", filters.officeId));
  if (filters?.matchedCustomerId) constraints.push(where("matchedCustomerId", "==", filters.matchedCustomerId));
  const leads = await leadRepository.findMany({ constraints });
  return leads.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

// Looks up an existing Customer by phone (last-10-digit match, so format
// differences like "+91 98765 43210" vs "9876543210" don't miss a real
// match) — shared by createLead (flag it immediately) and
// convertLeadToCustomer (reuse instead of duplicating).
async function findMatchingCustomer(phone: string): Promise<Customer | null> {
  const key = phoneMatchKey(phone);
  if (!key) return null;
  const customers = await fetchCustomers();
  return customers.find(c => phoneMatchKey(c.phone) === key) ?? null;
}

export async function fetchLeadById(id: string): Promise<Lead | null> {
  return leadRepository.findById(id);
}

export async function createLead(
  data: LeadFormData,
  createdBy: string
): Promise<Lead> {
  const refNumber = await nextRefNumber("LEAD");
  const matchedCustomer = await findMatchingCustomer(data.phone).catch(() => null);

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
    assignedAt:      data.assignedTo ? serverTimestamp() : null,
    agentName:       data.agentName || null,
    tripType:        data.tripType || null,
    source:          data.source || null,
    pax:             data.pax || null,
    matchedCustomerId: matchedCustomer?.id ?? null,
  });
}

export async function updateLead(
  id: string,
  data: Partial<LeadFormData>
): Promise<void> {
  const updateData: Partial<Lead> = { ...data as Partial<Lead> };

  if ("assignedTo" in data) {
    const existing = await fetchLeadById(id);
    const previousAssignedTo = existing?.assignedTo ?? null;
    const nextAssignedTo     = data.assignedTo ?? null;

    if (nextAssignedTo && nextAssignedTo !== previousAssignedTo) {
      updateData.assignedAt = serverTimestamp();
    } else if (!nextAssignedTo) {
      updateData.assignedAt = null;
    }
  }

  return leadRepository.update(id, updateData);
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
 * record if one doesn't already exist for that phone number. Returns the
 * customer either way (existing or newly created) so callers can chain
 * straight into other auto-actions (e.g. seeding a draft quotation)
 * without the user having to go find and re-select the customer.
 */
export async function convertLeadToCustomer(lead: Lead, createdBy: string): Promise<Customer> {
  // Already flagged at creation time (or a previous conversion) — reuse
  // that link directly instead of re-scanning every customer.
  if (lead.matchedCustomerId) {
    const existing = await fetchCustomerById(lead.matchedCustomerId);
    if (existing) return existing;
  }

  // Fallback for leads created before this matching existed, or a customer
  // that was created *after* this lead came in — same last-10-digit phone
  // match as findMatchingCustomer, backfilled onto the lead once found so
  // the Customer's "Enquiry History" and the Lead's badge both pick it up.
  const existing = await findMatchingCustomer(lead.phone);
  if (existing) {
    await leadRepository.update(lead.id, { matchedCustomerId: existing.id } as Partial<Lead>).catch(() => {});
    return existing;
  }

  const customer = await createCustomer({
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
    convertedFromLeadId: lead.id,
    assignedTo:     lead.assignedTo ?? null,
    agentName:      lead.agentName  ?? null,
  }, createdBy);

  await leadRepository.update(lead.id, { matchedCustomerId: customer.id } as Partial<Lead>).catch(() => {});
  return customer;
}

// Auto-seeds a draft quotation for the customer the moment their lead is
// marked "won" — so the sales agent lands on a quotation that already has
// the customer, destination, pax and a starting price line filled in,
// instead of opening a blank form and manually searching for the customer
// they just converted. Best-effort/non-blocking: the lead is already won
// and the customer already exists regardless of whether this succeeds.
// Guards against duplicates (e.g. a lead re-marked won) by checking for
// an existing quotation with the same leadId first.
export async function createDraftQuotationFromWonLead(
  lead: Lead, customer: Customer, createdBy: string
): Promise<void> {
  try {
    const existingQuotations = await fetchQuotations();
    if (existingQuotations.some(q => q.leadId === lead.id)) return;

    const tripNotes = [
      `Auto-created from won lead ${lead.refNumber}.`,
      lead.tripType   ? `Trip type: ${lead.tripType}.` : null,
      lead.travelDate ? `Travel date: ${lead.travelDate}.` : null,
      lead.duration   ? `Duration: ${lead.duration} night(s).` : null,
      lead.notes      ? `Lead notes: ${lead.notes}` : null,
    ].filter(Boolean).join(" ");

    // Line item amounts are per-pax prices (the quotation service multiplies
    // by pax to get the total) — the lead's budget is the customer's whole-
    // trip figure, so divide it back down to a starting per-pax price.
    const pax = lead.pax || 1;
    const perPaxBudget = lead.budget ? lead.budget / pax : 0;

    await createQuotation({
      customerId:    customer.id,
      customerName:  lead.name,
      customerPhone: lead.phone,
      destination:   lead.destination,
      packageId:     null,
      packageName:   null,
      pax,
      lineItems:     [{ description: `${lead.destination} package`, amount: perPaxBudget }],
      taxRate:       null,
      validUntil:    null,
      officeId:      lead.officeId,
      officeName:    lead.officeName,
      notes:         tripNotes,
      leadId:        lead.id,
      createdBy,
    }, createdBy, { autoSend: false });
  } catch {
    // Best-effort — the lead is already won and the customer already
    // exists either way, so a failure here should never surface as an error.
  }
}
