import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import { createLead } from "@/modules/leads/services/lead.service";
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
  return bookingRequestRepo.update(id, { requestStatus });
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
