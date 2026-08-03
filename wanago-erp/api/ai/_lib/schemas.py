# Pydantic mirrors of assistant-decision.schema.ts and the per-tool arg
# shapes from ai-tools.ts plus the new modules' Zod schemas (leads,
# quotations, bookings, invoices, payments, leave requests, employees,
# customers). Python never executes a write with these — it only proposes
# (see tools.py's module docstring) — so this is a best-effort shape check
# to keep the LLM honest and the confirm-card sane, not the authorization
# boundary. The real validation happens again in the existing TS service
# functions when the browser executes a confirmed proposal.
from typing import List, Optional

from pydantic import BaseModel


class AssistantDecision(BaseModel):
    action: str  # "call_tool" | "propose_write" | "respond"
    toolName: Optional[str] = None
    toolArgsJson: Optional[str] = None
    proposedSummary: Optional[str] = None
    finalAnswer: Optional[str] = None


ASSISTANT_DECISION_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "action": {"type": "STRING", "enum": ["call_tool", "propose_write", "respond"]},
        "toolName": {"type": "STRING"},
        "toolArgsJson": {"type": "STRING"},
        "proposedSummary": {"type": "STRING"},
        "finalAnswer": {"type": "STRING"},
    },
    "required": ["action"],
}


# ---- read-tool args ----

class EmptyArgs(BaseModel):
    pass


class SearchHelpArticlesArgs(BaseModel):
    query: str


class ListLeadsArgs(BaseModel):
    stage: Optional[str] = None
    assignedTo: Optional[str] = None


class RefLookupArgs(BaseModel):
    refNumberOrId: str


class ListQuotationsArgs(BaseModel):
    status: Optional[str] = None


class ListInvoicesArgs(BaseModel):
    status: Optional[str] = None


class ListCustomersArgs(BaseModel):
    customerType: Optional[str] = None


class ListBookingsArgs(BaseModel):
    status: Optional[str] = None


class ListPaymentsArgs(BaseModel):
    invoiceId: Optional[str] = None


class ListLeaveRequestsArgs(BaseModel):
    employeeId: Optional[str] = None
    status: Optional[str] = None


class ListCampaignsArgs(BaseModel):
    campaignStatus: Optional[str] = None


class DraftCampaignMessageArgs(BaseModel):
    campaignTopic: str
    audienceDescription: Optional[str] = None
    tone: Optional[str] = None


class GetLeadPriorityRankingArgs(BaseModel):
    assignedTo: Optional[str] = None  # uid — scope to one rep's own leads


class GetPackagePricingArgs(BaseModel):
    destination: Optional[str] = None


class DraftFollowUpMessageArgs(BaseModel):
    refNumberOrId: str  # a lead's refNumber or document id
    tone: Optional[str] = None


class GetPipelineAnalyticsArgs(BaseModel):
    officeId: Optional[str] = None


class DraftReferralMessageArgs(BaseModel):
    refNumberOrId: str  # a customer's refNumber or document id
    tone: Optional[str] = None


# ---- write-tool args (proposal-only — see module docstring above) ----

class LeadArgs(BaseModel):
    name: str
    phone: str
    destination: str
    email: Optional[str] = None
    tripType: Optional[str] = None
    travelDate: Optional[str] = None
    duration: Optional[float] = None
    pax: Optional[float] = None
    budget: Optional[float] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    officeId: str
    officeName: str


class QuotationLineItem(BaseModel):
    description: str
    amount: float


class QuotationArgs(BaseModel):
    customerId: str
    customerName: str
    customerPhone: str
    destination: str
    pax: float = 1
    lineItems: List[QuotationLineItem]
    officeId: str
    officeName: str
    taxRate: Optional[float] = None
    notes: Optional[str] = None


class BookingArgs(BaseModel):
    customerId: str
    customerName: str
    customerPhone: str
    destination: str
    tripType: str
    pax: float
    totalAmount: float
    advanceAmount: Optional[float] = 0
    officeId: str
    officeName: str
    leadId: Optional[str] = None
    packageId: Optional[str] = None
    packageName: Optional[str] = None
    travelDate: Optional[str] = None
    returnDate: Optional[str] = None
    assignedTo: Optional[str] = None
    agentName: Optional[str] = None
    notes: Optional[str] = None


class ApproveBookingFinanceArgs(BaseModel):
    bookingId: str
    paymentVerification: str = "full"  # "full" | "partial"


class ApproveBookingOperationsArgs(BaseModel):
    bookingId: str
    profitAmount: float


class InvoiceArgs(BaseModel):
    customerId: str
    customerName: str
    customerPhone: str
    totalAmount: float
    issueDate: str
    officeId: str
    officeName: str
    bookingId: Optional[str] = None
    bookingRef: Optional[str] = None
    amountPaid: Optional[float] = 0
    taxRate: Optional[float] = None
    dueDate: Optional[str] = None
    notes: Optional[str] = None


class RecordPaymentArgs(BaseModel):
    customerId: str
    customerName: str
    amount: float
    paymentMethod: str
    paymentDate: str
    officeId: str
    officeName: str
    invoiceId: Optional[str] = None
    invoiceRef: Optional[str] = None
    referenceNumber: Optional[str] = None
    notes: Optional[str] = None


class LeaveDecisionArgs(BaseModel):
    leaveRequestId: str
    comments: Optional[str] = None


class UpdateEmployeeArgs(BaseModel):
    employeeId: str
    fullName: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    employmentType: Optional[str] = None
    employeeStatus: Optional[str] = None
    mobileNumber: Optional[str] = None
    email: Optional[str] = None
    reportingManagerId: Optional[str] = None
    functionalManagerId: Optional[str] = None


class CustomerArgs(BaseModel):
    fullName: str
    phone: str
    customerType: str
    source: str
    officeId: str
    officeName: str
    email: Optional[str] = None
    alternatePhone: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    assignedTo: Optional[str] = None
    agentName: Optional[str] = None
    notes: Optional[str] = None


class UpdateCustomerArgs(BaseModel):
    customerId: str
    fullName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


# ---- newer read/draft tools ----

class ListSuspiciousAttendanceArgs(BaseModel):
    employeeId: Optional[str] = None
    reviewed: Optional[bool] = None


class MineTestimonialsArgs(BaseModel):
    destination: Optional[str] = None


class SuggestTicketPriorityArgs(BaseModel):
    title: str
    description: str


class DraftTicketReplyArgs(BaseModel):
    refNumberOrId: str
    context: Optional[str] = None


class FlagExpenseAnomaliesArgs(BaseModel):
    officeId: Optional[str] = None


class GetEmployeePerformanceArgs(BaseModel):
    refNumberOrId: str


# ---- itinerary write tool ----
# createItinerary is a genuine write-tool proposal like createBooking/
# createQuotation — the top-level orchestrator LLM generates the full
# day-by-day content itself when it decides to propose this tool (same
# mechanism already used for every other write tool), no separate drafting
# sub-call needed. Mirrors src/modules/itineraries/types/index.ts's
# ItineraryFormData shape.

class ItineraryDayArgs(BaseModel):
    dayNumber: int
    title: str
    description: str


class CreateItineraryArgs(BaseModel):
    title: str
    destination: str
    durationDays: int
    days: List[ItineraryDayArgs]
    officeId: str
    officeName: str
    tripType: Optional[str] = None
    tagline: Optional[str] = None
    inclusions: List[str] = []
    exclusions: List[str] = []
    notes: Optional[str] = None
