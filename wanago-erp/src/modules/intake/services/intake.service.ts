import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import { createLead } from "@/modules/leads/services/lead.service";
import { fetchCustomerById } from "@/modules/customers/services/customer.service";
import { notifyUser } from "@/lib/notify";
import type { BookingRequest, QuickInquiry, IntakeStatus } from "@/modules/intake/types";
import type { LeadFormData } from "@/modules/leads/types";

class BookingRequestRepository extends BaseRepository<BookingRequest> {
  constructor() { super(FIRESTORE_COLLECTIONS.BOOKING_REQUESTS); }
}
const bookingRequestRepo = new BookingRequestRepository();

class QuickInquiryRepository extends BaseRepository<QuickInquiry> {
  constructor() { super(FIRESTORE_COLLECTIONS.QUICK_INQUIRIES); }
}
const quickInquiryRepo = new QuickInquiryRepository();

export async function fetchBookingRequests(): Promise<BookingRequest[]> {
  const requests = await bookingRequestRepo.findMany();
  return requests.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function markBookingRequestStatus(id: string, requestStatus: IntakeStatus): Promise<void> {
  await bookingRequestRepo.update(id, { requestStatus });

  // Best-effort — only fires on the "we're reaching out" transition, not
  // every status change, so the customer gets exactly one heads-up rather
  // than a notification per status edit.
  if (requestStatus === "contacted") {
    const request = await bookingRequestRepo.findById(id);
    if (request) {
      const customer = await fetchCustomerById(request.customerId);
      if (customer) {
        notifyUser({
          email: customer.email ?? null,
          phone: customer.phone ?? null,
          title: "We're reaching out about your trip request",
          body: `Thanks for your interest in ${request.packageName} — our team is reviewing it and will contact you shortly to finalize the details.`,
          category: "followup",
        }).catch(() => {});
      }
    }
  }
}

export async function fetchQuickInquiries(): Promise<QuickInquiry[]> {
  const inquiries = await quickInquiryRepo.findMany();
  return inquiries.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function markQuickInquiryStatus(id: string, inquiryStatus: IntakeStatus): Promise<void> {
  return quickInquiryRepo.update(id, { inquiryStatus });
}

// Turns a raw quick inquiry into a real Lead the sales pipeline already
// knows how to work — the inquiry itself stays around (marked "converted")
// as a record of where the lead came from, rather than being deleted.
export async function convertQuickInquiryToLead(
  inquiry: QuickInquiry,
  officeId: string,
  officeName: string,
  createdBy: string
): Promise<void> {
  const data: LeadFormData = {
    name: inquiry.name || "Unknown",
    email: null,
    phone: inquiry.phone,
    alternatePhone: null,
    destination: "Not specified yet",
    tripType: null, travelDate: null, returnDate: null, duration: null, pax: null, budget: null,
    stage: "new", priority: "warm", source: "Quick Inquiry",
    assignedTo: null, agentName: null,
    matchedCustomerId: null,
    referredByCustomerId: null, referredByPartnerId: null,
    bookingLinkToken: null,
    officeId, officeName,
    notes: `Area/address given: ${inquiry.address}`,
    lastContactedAt: null,
    createdBy,
  };
  await createLead(data, createdBy);
  await markQuickInquiryStatus(inquiry.id, "converted");
}
