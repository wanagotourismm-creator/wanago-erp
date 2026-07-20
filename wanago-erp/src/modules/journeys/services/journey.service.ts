import { where, limit } from "firebase/firestore";
import { journeyRepository } from "@/modules/journeys/services/journey.repository";
import { journeyRunRepository } from "@/modules/journeys/services/journey-run.repository";
import { fetchCustomerById } from "@/modules/customers/services/customer.service";
import type { Journey, JourneyFormData, JourneyRun, JourneyTrigger } from "@/modules/journeys/types";

export async function fetchJourneys(): Promise<Journey[]> {
  return journeyRepository.findMany();
}

export async function createJourney(data: JourneyFormData, createdBy: string): Promise<Journey> {
  return journeyRepository.create({
    ...data, createdBy, status: "active",
    enteredCount: 0, sentCount: 0, repliedCount: 0, convertedCount: 0, revenueTotal: 0,
  });
}

export async function updateJourney(id: string, data: Partial<JourneyFormData>): Promise<void> {
  return journeyRepository.update(id, data);
}

export async function deleteJourney(id: string): Promise<void> {
  return journeyRepository.delete(id);
}

export async function fetchJourneyRuns(journeyId: string): Promise<JourneyRun[]> {
  return journeyRunRepository.findMany({ constraints: [where("journeyId", "==", journeyId)] });
}

// Minimal shape shared by Quotation/Booking — both carry a customerId/
// customerName/customerPhone; neither carries a customerEmail, so it's
// looked up separately, same as Tool 2's scheduleReviewRequest.
type TriggerEntity = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  createdBy: string;
  assignedTo?: string | null; // Booking has this; Quotation doesn't (falls back to createdBy)
};

function matchesTrigger(journeyTrigger: JourneyTrigger, triggerType: JourneyTrigger["type"]): boolean {
  return journeyTrigger.type === triggerType;
}

// Called client-side from quotation.service.ts's sendQuotation() and
// booking.service.ts's updateBookingStatus() — best-effort, same
// try/catch convention as createReferralBonusIfEligible/scheduleReviewRequest.
// Only ever CREATES the run (cheap Firestore write); the actual
// WhatsApp/email send happens exclusively from the journey-engine cron
// (journey-engine.server.ts), since sendWhatsAppSmart needs the Admin SDK
// and can't run in a browser bundle at all, let alone safely. So even an
// "instant" trigger's first action waits for the next daily engine pass,
// same as every later step.
export async function createJourneyRunsForTrigger(
  triggerType: JourneyTrigger["type"], entity: TriggerEntity
): Promise<void> {
  const allJourneys = await fetchJourneys();
  const matching = allJourneys.filter((j) => j.isActive && matchesTrigger(j.trigger, triggerType));
  if (matching.length === 0) return;

  const customer = await fetchCustomerById(entity.customerId).catch(() => null);
  if (customer?.marketingOptOut) return; // never even enters a journey once opted out

  for (const journey of matching) {
    const existing = await journeyRunRepository.findMany({
      constraints: [
        where("journeyId", "==", journey.id),
        where("entityId", "==", entity.customerId),
        limit(1),
      ],
    });
    if (existing.length > 0) continue; // idempotent — one run per (journey, entity), ever

    await journeyRunRepository.create({
      journeyId: journey.id,
      entityType: "customer",
      entityId: entity.customerId,
      entityName: entity.customerName,
      entityPhone: entity.customerPhone,
      entityEmail: customer?.email ?? null,
      agentId: entity.assignedTo ?? entity.createdBy ?? null,
      currentStepIndex: 0,
      nextStepDueAt: new Date(),
      runStatus: "active",
      sentWhatsappCount: 0,
      sentEmailCount: 0,
      repliedAt: null,
      convertedBookingId: null,
      convertedRevenue: null,
      createdBy: entity.createdBy,
      status: "active",
    });

    await journeyRepository.update(journey.id, { enteredCount: journey.enteredCount + 1 });
  }
}
