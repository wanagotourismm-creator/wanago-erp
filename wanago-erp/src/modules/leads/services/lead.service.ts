import { where, serverTimestamp, type QueryConstraint } from "firebase/firestore";
import { leadRepository } from "@/modules/leads/services/lead.repository";
import { toDate, formatCurrency } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { auth } from "@/lib/firebase/client";
import { notifyUser } from "@/lib/notify";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { LEAD_STAGES } from "@/lib/constants";
import type { Lead, LeadFormData } from "@/modules/leads/types";
import { createCustomer, fetchCustomerById } from "@/modules/customers/services/customer.service";
import { fetchQuotations, createQuotation } from "@/modules/quotations/services/quotation.service";
import type { Customer } from "@/modules/customers/types";

// Least-loaded auto-assignment: previously every new lead needed a human
// to manually pick an agent from the dropdown (or it silently stayed
// unassigned forever) — this fires whenever a lead is created with no
// assignedTo, so a lead is never sitting unowned by accident. Prefers
// active Sales employees in the lead's own office; falls back to any
// active Sales employee company-wide if that office has none, rather than
// leaving the lead unassigned.
async function pickLeastLoadedAgent(officeId: string): Promise<{ assignedTo: string; agentName: string; userId: string | null; email: string | null } | null> {
  const [employees, leads] = await Promise.all([fetchEmployees(), fetchLeads()]);
  const activeSales = employees.filter((e) => e.department === "Sales" && e.employeeStatus === "active");
  const pool = activeSales.filter((e) => e.officeId === officeId);
  const candidates = pool.length > 0 ? pool : activeSales;
  if (candidates.length === 0) return null;

  const openLoadByAgent = new Map<string, number>();
  for (const lead of leads) {
    if (!lead.assignedTo) continue;
    if (lead.stage === LEAD_STAGES.WON || lead.stage === LEAD_STAGES.LOST) continue;
    openLoadByAgent.set(lead.assignedTo, (openLoadByAgent.get(lead.assignedTo) ?? 0) + 1);
  }

  let best = candidates[0];
  let bestLoad = openLoadByAgent.get(best.id) ?? 0;
  for (const agent of candidates.slice(1)) {
    const load = openLoadByAgent.get(agent.id) ?? 0;
    if (load < bestLoad) { best = agent; bestLoad = load; }
  }
  return { assignedTo: best.id, agentName: best.fullName, userId: best.userId ?? null, email: best.email };
}

async function notifyAutoAssignedAgent(lead: Lead, userId: string | null, email: string | null): Promise<void> {
  if (!userId) return;
  try {
    await notifyUser({
      userId,
      email,
      title:    `New lead assigned: ${lead.name}`,
      body:     `${lead.name} (${lead.destination}) was auto-assigned to you — least-loaded agent in ${lead.officeName}.`,
      link:     "/leads",
      category: "followup",
    });
  } catch {
    // Best-effort — the lead is already correctly assigned either way.
  }
}

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
//
// Goes through a server route (Admin SDK) rather than fetchCustomers() —
// the client SDK read is scoped by firestore.rules' canViewAssigned() to
// only the caller's own + unassigned customers, so a plain sales/marketing
// user's search would silently miss a real match owned by a different
// agent and create a duplicate Customer record instead of reusing theirs.
async function findMatchingCustomer(phone: string): Promise<Customer | null> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return null;
    const res = await fetch("/api/customers/find-by-phone", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.customer ?? null;
  } catch {
    return null;
  }
}

export async function fetchLeadById(id: string): Promise<Lead | null> {
  return leadRepository.findById(id);
}

export async function createLead(
  data: LeadFormData,
  createdBy: string,
  // Only meaningful for bulk-importing historical leads with their real
  // enquiry date — a normal manual "Add Lead" leaves this unset and gets
  // today's serverTimestamp() as before.
  options?: { createdAt?: Date }
): Promise<Lead> {
  const refNumber = await nextRefNumber("LEAD");
  const matchedCustomer = await findMatchingCustomer(data.phone).catch(() => null);

  let assignedTo = data.assignedTo || null;
  let agentName  = data.agentName  || null;
  let autoAssignedUserId: string | null = null;
  let autoAssignedEmail: string | null = null;
  if (!assignedTo) {
    try {
      const auto = await pickLeastLoadedAgent(data.officeId);
      if (auto) {
        assignedTo = auto.assignedTo;
        agentName  = auto.agentName;
        autoAssignedUserId = auto.userId;
        autoAssignedEmail  = auto.email;
      }
    } catch {
      // Best-effort — an unassigned lead is still fully usable; failing to
      // auto-assign must never block lead creation.
    }
  }

  const lead = await leadRepository.create({
    ...data,
    createdAt: options?.createdAt,
    refNumber,
    createdBy,
    status:          "active",
    lastContactedAt: null,
    email:           data.email || null,
    alternatePhone:  data.alternatePhone || null,
    notes:           data.notes || null,
    assignedTo,
    assignedAt:      assignedTo ? serverTimestamp() : null,
    agentName,
    tripType:        data.tripType || null,
    source:          data.source || null,
    pax:             data.pax || null,
    matchedCustomerId: matchedCustomer?.id ?? null,
  });

  if (autoAssignedUserId) await notifyAutoAssignedAgent(lead, autoAssignedUserId, autoAssignedEmail);

  return lead;
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

// Generates the customer self-booking link (/book/{token}) for this lead —
// a long random token, not tied to any account, so no login is needed to
// use it. Idempotent: returns the existing token if one was already
// generated, so re-clicking "Generate Link" doesn't invalidate a link
// already sent to the customer.
export async function generateBookingLink(lead: Lead): Promise<string> {
  if (lead.bookingLinkToken) return lead.bookingLinkToken;
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  await leadRepository.update(lead.id, { bookingLinkToken: token } as Partial<Lead>);
  return token;
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
    referredByCustomerId: lead.referredByCustomerId ?? null,
    assignedTo:     lead.assignedTo ?? null,
    agentName:      lead.agentName  ?? null,
  }, createdBy);

  await leadRepository.update(lead.id, { matchedCustomerId: customer.id } as Partial<Lead>).catch(() => {});
  return customer;
}

// Shared by both quotation-seeding paths below — line item amounts are
// per-pax prices (the quotation service multiplies by pax to get the
// total), so the lead's budget (a whole-trip figure) is divided back down
// to a starting per-pax price.
function buildDraftQuotationPayload(lead: Lead, customer: Customer, createdBy: string, notePrefix: string) {
  const pax = lead.pax || 1;
  const perPaxBudget = lead.budget ? lead.budget / pax : 0;

  const tripNotes = [
    notePrefix,
    lead.budget     ? `Customer's stated budget: ${formatCurrency(lead.budget)} total (${formatCurrency(perPaxBudget)}/pax) — price the quotation below, then adjust to match what was actually discussed.` : null,
    lead.tripType   ? `Trip type: ${lead.tripType}.` : null,
    lead.travelDate ? `Travel date: ${lead.travelDate}.` : null,
    lead.duration   ? `Duration: ${lead.duration} night(s).` : null,
    lead.notes      ? `Lead notes: ${lead.notes}` : null,
  ].filter(Boolean).join(" ");

  return {
    customerId:    customer.id,
    customerName:  lead.name,
    customerPhone: lead.phone,
    destination:   lead.destination,
    packageId:     null,
    packageName:   null,
    pax,
    lineItems:     [{
      description: lead.budget
        ? `${lead.destination} package (customer's stated budget: ${formatCurrency(lead.budget)} total)`
        : `${lead.destination} package`,
      amount: perPaxBudget,
    }],
    taxRate:       null,
    validUntil:    null,
    officeId:      lead.officeId,
    officeName:    lead.officeName,
    notes:         tripNotes,
    leadId:        lead.id,
    createdBy,
  };
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

    await createQuotation(
      buildDraftQuotationPayload(lead, customer, createdBy, `Auto-created from won lead ${lead.refNumber}.`),
      createdBy,
      { autoSend: false }
    );
  } catch {
    // Best-effort — the lead is already won and the customer already
    // exists either way, so a failure here should never surface as an error.
  }
}

// Manual counterpart used by the Leads page's "Create Quotation" action —
// lets an agent start a real quotation (as a draft, priced and sent later
// from the Quotations page) at any point in the pipeline, not just once a
// lead is marked "won". Reuses/creates the Customer the same way won-lead
// conversion does, and is dedup'd on leadId the same way — so clicking it
// again on a lead that already has a quotation just reopens that one
// instead of creating a duplicate. Unlike the won-lead path, errors here
// are surfaced to the caller since a human explicitly asked for this.
export async function createQuotationFromLead(
  lead: Lead, createdBy: string
): Promise<{ quotationId: string }> {
  const customer = await convertLeadToCustomer(lead, createdBy);

  const existingQuotations = await fetchQuotations();
  const existing = existingQuotations.find(q => q.leadId === lead.id);
  if (existing) return { quotationId: existing.id };

  const quotation = await createQuotation(
    buildDraftQuotationPayload(lead, customer, createdBy, `Created from lead ${lead.refNumber}.`),
    createdBy,
    { autoSend: false }
  );
  return { quotationId: quotation.id };
}
