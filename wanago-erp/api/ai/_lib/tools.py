# Tool registry — Python port and expansion of
# src/modules/ai-core/services/ai-tools.ts. Read tools run directly against
# Firestore via the Admin SDK (bypassing security rules, same trust model as
# the TS version — there's no authenticated client session inside this
# service either), which is why the newly-added sensitive read tools
# (invoices, payments, leave requests, employees, campaigns) carry an
# allowed_roles check that ai-tools.ts's original 9 read tools never needed.
#
# Write tools never touch Firestore here. They only validate args and get
# returned as a proposal — the actual write still happens client-side in the
# browser, through the *existing* TS service functions, via
# src/modules/aiassistant/services/ai-assistant.service.ts's
# confirmProposedAction() dispatch table. That is the only way to keep
# ref-number generation, GST math, booking-approval transactions, leave
# entitlement checks, and notification triggers intact without
# reimplementing all of that business logic here (see the plan's research:
# these are TS-service-only, not enforced by firestore.rules).
import re
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Type

from pydantic import BaseModel

from . import schemas as s
from .firestore_client import get_db
from .gemini_client import generate_text

MAX_LIST_RESULTS = 15


def _ms(value: Any) -> float:
    if value is None:
        return 0.0
    ts = getattr(value, "timestamp", None)
    if callable(ts):
        try:
            return ts()
        except Exception:
            return 0.0
    return 0.0


def sort_by_created_at_desc(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return sorted(docs, key=lambda d: _ms(d.get("createdAt")), reverse=True)


def query_collection(collection: str, wheres: List[tuple]) -> List[Dict[str, Any]]:
    db = get_db()
    if not db:
        return []
    query = db.collection(collection)
    for field_name, op, value in wheres:
        query = query.where(field_name, op, value)
    return [{"id": d.id, **(d.to_dict() or {})} for d in query.stream()]


def find_by_ref_or_id(collection: str, ref_or_id: str) -> Optional[Dict[str, Any]]:
    db = get_db()
    if not db:
        return None
    doc = db.collection(collection).document(ref_or_id).get()
    if doc.exists:
        return {"id": doc.id, **(doc.to_dict() or {})}
    for d in db.collection(collection).where("refNumber", "==", ref_or_id).limit(1).stream():
        return {"id": d.id, **(d.to_dict() or {})}
    return None


def _tokenize(text: str) -> set:
    return set(re.findall(r"[^\W\d_]+|\d+", text.lower(), re.UNICODE))


# ── searchHelpArticles ──────────────────────────────────────────
# Mirrors the keyword-scoring logic ai-tools.ts reimplemented from
# help-article.service.ts for the same server-side-only reason.
def search_help_articles(args: s.SearchHelpArticlesArgs) -> Dict[str, Any]:
    db = get_db()
    if not db:
        return {"articles": []}
    query_tokens = _tokenize(args.query)
    scored = []
    for d in db.collection("helpArticles").stream():
        data = d.to_dict() or {}
        title_tokens = _tokenize(str(data.get("title", "")))
        keyword_tokens: set = set()
        for k in data.get("keywords", []) or []:
            keyword_tokens |= _tokenize(str(k))
        category_tokens = _tokenize(str(data.get("category", "")))
        content_tokens = _tokenize(str(data.get("content", "")))
        score = 0
        for tok in query_tokens:
            if tok in title_tokens: score += 3
            if tok in keyword_tokens: score += 3
            if tok in category_tokens: score += 2
            if tok in content_tokens: score += 1
        if score > 0:
            scored.append((score, {"title": data.get("title"), "content": data.get("content")}))
    scored.sort(key=lambda x: x[0], reverse=True)
    return {"articles": [a for _, a in scored[:3]]}


MAX_POLICY_CONTEXT_CHARS = 30_000


def get_hr_policy_context(_args: s.EmptyArgs) -> Dict[str, Any]:
    db = get_db()
    if not db:
        return {"policyText": None}
    docs = []
    for d in db.collection("hrPolicyDocuments").where("docStatus", "==", "active").stream():
        data = d.to_dict() or {}
        if data.get("extractedText"):
            docs.append((data.get("title"), data.get("extractedText")))
    if not docs:
        return {"policyText": None}
    combined = ""
    truncated = False
    for title, text in docs:
        section = f"--- {title} ---\n{text}\n\n"
        if len(combined) + len(section) > MAX_POLICY_CONTEXT_CHARS:
            truncated = True
            break
        combined += section
    if truncated:
        combined += "\n[Some additional documents were omitted for length.]"
    return {"policyText": combined}


def list_leads(args: s.ListLeadsArgs) -> Dict[str, Any]:
    wheres = []
    if args.stage: wheres.append(("stage", "==", args.stage))
    if args.assignedTo: wheres.append(("assignedTo", "==", args.assignedTo))
    docs = sort_by_created_at_desc(query_collection("leads", wheres))[:MAX_LIST_RESULTS]
    return {"leads": [
        {"refNumber": l.get("refNumber"), "name": l.get("name"), "phone": l.get("phone"),
         "destination": l.get("destination"), "stage": l.get("stage"), "priority": l.get("priority"),
         "assignedTo": l.get("assignedTo"), "source": l.get("source")} for l in docs
    ]}


def get_lead_by_id(args: s.RefLookupArgs) -> Dict[str, Any]:
    return {"lead": find_by_ref_or_id("leads", args.refNumberOrId)}


def list_quotations(args: s.ListQuotationsArgs) -> Dict[str, Any]:
    wheres = [("status", "==", args.status)] if args.status else []
    docs = sort_by_created_at_desc(query_collection("quotations", wheres))[:MAX_LIST_RESULTS]
    return {"quotations": [
        {"refNumber": q.get("refNumber"), "customerName": q.get("customerName"), "destination": q.get("destination"),
         "status": q.get("status"), "totalAmount": q.get("totalAmount"),
         "financeApprovalStatus": q.get("financeApprovalStatus")} for q in docs
    ]}


def get_quotation_by_id(args: s.RefLookupArgs) -> Dict[str, Any]:
    return {"quotation": find_by_ref_or_id("quotations", args.refNumberOrId)}


def list_invoices(args: s.ListInvoicesArgs) -> Dict[str, Any]:
    wheres = [("status", "==", args.status)] if args.status else []
    docs = sort_by_created_at_desc(query_collection("invoices", wheres))[:MAX_LIST_RESULTS]
    return {"invoices": [
        {"refNumber": i.get("refNumber"), "customerName": i.get("customerName"), "status": i.get("status"),
         "totalAmount": i.get("totalAmount"), "amountPaid": i.get("amountPaid"), "dueDate": i.get("dueDate")}
        for i in docs
    ]}


def get_invoice_by_id(args: s.RefLookupArgs) -> Dict[str, Any]:
    return {"invoice": find_by_ref_or_id("invoices", args.refNumberOrId)}


def list_customers(args: s.ListCustomersArgs) -> Dict[str, Any]:
    wheres = [("customerType", "==", args.customerType)] if args.customerType else []
    docs = sort_by_created_at_desc(query_collection("customers", wheres))[:MAX_LIST_RESULTS]
    return {"customers": [
        {"refNumber": c.get("refNumber"), "fullName": c.get("fullName"), "phone": c.get("phone"),
         "email": c.get("email"), "customerType": c.get("customerType"), "city": c.get("city")} for c in docs
    ]}


def get_customer_by_id(args: s.RefLookupArgs) -> Dict[str, Any]:
    return {"customer": find_by_ref_or_id("customers", args.refNumberOrId)}


def list_bookings(args: s.ListBookingsArgs) -> Dict[str, Any]:
    wheres = [("status", "==", args.status)] if args.status else []
    docs = sort_by_created_at_desc(query_collection("bookings", wheres))[:MAX_LIST_RESULTS]
    return {"bookings": [
        {"refNumber": b.get("refNumber"), "customerName": b.get("customerName"), "destination": b.get("destination"),
         "status": b.get("status"), "totalAmount": b.get("totalAmount"), "balanceAmount": b.get("balanceAmount"),
         "travelDate": b.get("travelDate")} for b in docs
    ]}


def get_booking_by_id(args: s.RefLookupArgs) -> Dict[str, Any]:
    return {"booking": find_by_ref_or_id("bookings", args.refNumberOrId)}


def list_payments(args: s.ListPaymentsArgs) -> Dict[str, Any]:
    wheres = [("invoiceId", "==", args.invoiceId)] if args.invoiceId else []
    docs = sort_by_created_at_desc(query_collection("payments", wheres))[:MAX_LIST_RESULTS]
    return {"payments": [
        {"customerName": p.get("customerName"), "amount": p.get("amount"), "paymentMethod": p.get("paymentMethod"),
         "paymentDate": p.get("paymentDate"), "invoiceRef": p.get("invoiceRef")} for p in docs
    ]}


def list_leave_requests(args: s.ListLeaveRequestsArgs) -> Dict[str, Any]:
    wheres = []
    if args.employeeId: wheres.append(("employeeId", "==", args.employeeId))
    if args.status: wheres.append(("status", "==", args.status))
    docs = sort_by_created_at_desc(query_collection("hrmsLeaves", wheres))[:MAX_LIST_RESULTS]
    return {"leaveRequests": [
        {"id": r.get("id"), "employeeName": r.get("employeeName"), "leaveType": r.get("leaveType"),
         "fromDate": r.get("fromDate"), "toDate": r.get("toDate"), "status": r.get("status")} for r in docs
    ]}


# Never surfaces bank/PAN/salary numbers through the assistant, even to
# hr/admin — there's no legitimate "chat about it" use case, and keeping it
# out at the source is cheaper than trusting every future prompt tweak to
# keep asking for it responsibly.
_EMPLOYEE_SENSITIVE_FIELDS = (
    "bankAccountNumber", "ifscCode", "panNumber", "uan", "pfNumber",
    "basicSalary", "hra", "allowances", "monthlyProfitTarget",
)


def get_employee_by_id(args: s.RefLookupArgs) -> Dict[str, Any]:
    employee = find_by_ref_or_id("hrmsEmployees", args.refNumberOrId)
    if employee:
        for key in _EMPLOYEE_SENSITIVE_FIELDS:
            employee.pop(key, None)
    return {"employee": employee}


def list_campaigns(args: s.ListCampaignsArgs) -> Dict[str, Any]:
    wheres = [("campaignStatus", "==", args.campaignStatus)] if args.campaignStatus else []
    docs = sort_by_created_at_desc(query_collection("campaigns", wheres))[:MAX_LIST_RESULTS]
    return {"campaigns": [
        {"name": c.get("name"), "channel": c.get("channel"), "campaignType": c.get("campaignType"),
         "campaignStatus": c.get("campaignStatus"), "budget": c.get("budget")} for c in docs
    ]}


# ── draftCampaignMessage ────────────────────────────────────────
# Content generation, not a database read or write — modeled as a "read"
# tool (no Firestore proposal/confirm needed) since there's nothing to
# persist: it returns copy text for a human marketer to review and send
# manually through the existing WhatsApp send flow.
def draft_campaign_message(args: s.DraftCampaignMessageArgs) -> Dict[str, Any]:
    prompt = (
        f"Write a short, warm WhatsApp marketing message about: {args.campaignTopic}. "
        + (f"Audience: {args.audienceDescription}. " if args.audienceDescription else "")
        + (f"Tone: {args.tone}. " if args.tone else "")
        + "Keep it under 300 characters, plain text only (no markdown, no links unless one was given). "
          "This is a DRAFT for a human marketer to review before sending — never claim it has been sent."
    )
    result = generate_text(feature="ai-employee-campaign-draft", prompt=prompt, created_by="system")
    return {"draftText": result["text"]}


@dataclass
class AiTool:
    name: str
    kind: str  # "read" | "write"
    description: str
    args_model: Type[BaseModel]
    run: Optional[Callable[[BaseModel], Dict[str, Any]]] = None
    # Friendly pre-check before showing a proposal card (write tools) or
    # before running a query at all (the newly-added sensitive read tools —
    # invoices/payments/leave/employees/campaigns bypass firestore.rules via
    # the Admin SDK, so this is the only enforcement they get).
    # firestore.rules remains the real authorization boundary for writes.
    allowed_roles: Optional[List[str]] = None


AI_TOOLS: List[AiTool] = [
    AiTool("searchHelpArticles", "read",
           "Search the ERP's internal help documentation for how-to-use-the-app questions. Args: { query: string }.",
           s.SearchHelpArticlesArgs, run=search_help_articles),
    AiTool("getHrPolicyContext", "read",
           "Fetch the full text of all active company HR policy documents (leave policy, attendance, conduct, etc). No args.",
           s.EmptyArgs, run=get_hr_policy_context),
    AiTool("listLeads", "read",
           "List sales leads, optionally filtered. Args: { stage?: string ('new'|'contacted'|'follow_up'|'quoted'|'negotiation'|'won'|'lost'), assignedTo?: string (uid) }.",
           s.ListLeadsArgs, run=list_leads),
    AiTool("getLeadById", "read",
           "Get full details of one lead by its refNumber (e.g. 'LD-0001') or document id. Args: { refNumberOrId: string }.",
           s.RefLookupArgs, run=get_lead_by_id),
    AiTool("listQuotations", "read",
           "List quotations, optionally filtered by status. Args: { status?: string ('draft'|'sent'|'accepted'|'rejected') }.",
           s.ListQuotationsArgs, run=list_quotations),
    AiTool("getQuotationById", "read",
           "Get full details of one quotation by its refNumber (e.g. 'QT-0001') or document id. Args: { refNumberOrId: string }.",
           s.RefLookupArgs, run=get_quotation_by_id),
    AiTool("listInvoices", "read",
           "List invoices, optionally filtered by status. Args: { status?: string ('draft'|'sent'|'unpaid'|'partial'|'paid'|'overdue') }.",
           s.ListInvoicesArgs, run=list_invoices, allowed_roles=["super_admin", "admin", "finance"]),
    AiTool("getInvoiceById", "read",
           "Get full details of one invoice by its refNumber or document id. Args: { refNumberOrId: string }.",
           s.RefLookupArgs, run=get_invoice_by_id, allowed_roles=["super_admin", "admin", "finance"]),
    AiTool("listCustomers", "read",
           "List customers, optionally filtered by type. Args: { customerType?: string ('individual'|'corporate') }.",
           s.ListCustomersArgs, run=list_customers),
    AiTool("getCustomerById", "read",
           "Get full details of one customer by its refNumber (e.g. 'CUS-0001') or document id. Args: { refNumberOrId: string }.",
           s.RefLookupArgs, run=get_customer_by_id),
    AiTool("listBookings", "read",
           "List bookings, optionally filtered by status ('pending_finance'|'ops_pending'|'confirmed'|'completed'|etc). Args: { status?: string }.",
           s.ListBookingsArgs, run=list_bookings),
    AiTool("getBookingById", "read",
           "Get full details of one booking by its refNumber or document id. Args: { refNumberOrId: string }.",
           s.RefLookupArgs, run=get_booking_by_id),
    AiTool("listPayments", "read",
           "List payments, optionally filtered by invoiceId. Args: { invoiceId?: string }.",
           s.ListPaymentsArgs, run=list_payments, allowed_roles=["super_admin", "admin", "finance"]),
    AiTool("listLeaveRequests", "read",
           "List HR leave requests, optionally filtered by employeeId and/or status ('pending'|'approved'|'rejected'|'cancelled'). Args: { employeeId?: string, status?: string }.",
           s.ListLeaveRequestsArgs, run=list_leave_requests, allowed_roles=["super_admin", "admin", "hr"]),
    AiTool("getEmployeeById", "read",
           "Get an employee's non-sensitive HR record (name, department, designation, status — never salary/bank/PAN details) by refNumber or document id. Args: { refNumberOrId: string }.",
           s.RefLookupArgs, run=get_employee_by_id, allowed_roles=["super_admin", "admin", "hr"]),
    AiTool("listCampaigns", "read",
           "List marketing campaigns, optionally filtered by campaignStatus. Args: { campaignStatus?: string }.",
           s.ListCampaignsArgs, run=list_campaigns, allowed_roles=["super_admin", "admin", "marketing"]),
    AiTool("draftCampaignMessage", "read",
           "Draft short WhatsApp campaign message copy for a human marketer to review and send manually — this NEVER sends anything, it only returns text. Args: { campaignTopic: string, audienceDescription?: string, tone?: string }.",
           s.DraftCampaignMessageArgs, run=draft_campaign_message, allowed_roles=["super_admin", "admin", "marketing"]),

    # ---- write tools: proposal-only, never executed here (see module docstring) ----
    AiTool("createLead", "write",
           "Propose creating a new sales lead. Args must match: { name, phone, destination, email?, tripType?, travelDate?, duration?, pax?, budget?, source?, notes?, officeId, officeName }. officeId/officeName should be copied from context if known, otherwise ask the user which office.",
           s.LeadArgs, allowed_roles=None),
    AiTool("createQuotation", "write",
           "Propose creating a draft quotation (never auto-sent to the customer). Args must match: { customerId, customerName, customerPhone, destination, pax, lineItems: [{description, amount}], officeId, officeName, taxRate?, notes? }. Look up the customer first with listCustomers/getCustomerById to get a real customerId — never invent one.",
           s.QuotationArgs, allowed_roles=["super_admin", "admin", "sales"]),
    AiTool("createBooking", "write",
           "Propose creating a new booking (starts in pending_finance status, awaiting Finance approval). Args: { customerId, customerName, customerPhone, destination, tripType, pax, totalAmount, advanceAmount?, officeId, officeName, leadId?, packageId?, packageName?, travelDate?, returnDate?, assignedTo?, agentName?, notes? }. Look up the real customerId first.",
           s.BookingArgs, allowed_roles=["super_admin", "admin", "sales", "operations"]),
    AiTool("approveBookingFinance", "write",
           "Propose Finance-approving a booking (moves pending_finance -> ops_pending). Args: { bookingId, paymentVerification?: 'full'|'partial' }. Look up the booking first with listBookings/getBookingById to get its document id.",
           s.ApproveBookingFinanceArgs, allowed_roles=["super_admin", "admin", "finance"]),
    AiTool("approveBookingOperations", "write",
           "Propose Operations-approving a booking (moves ops_pending -> confirmed). Args: { bookingId, profitAmount }.",
           s.ApproveBookingOperationsArgs, allowed_roles=["super_admin", "admin", "operations"]),
    AiTool("createInvoice", "write",
           "Propose creating an invoice. Args: { customerId, customerName, customerPhone, totalAmount, issueDate, officeId, officeName, bookingId?, bookingRef?, amountPaid?, taxRate?, dueDate?, notes? }. Never compute taxAmount yourself — omit it, the invoice form derives it.",
           s.InvoiceArgs, allowed_roles=["super_admin", "admin", "finance"]),
    AiTool("recordPayment", "write",
           "Propose recording a payment against an invoice. Args: { customerId, customerName, amount, paymentMethod, paymentDate, officeId, officeName, invoiceId?, invoiceRef?, referenceNumber?, notes? }.",
           s.RecordPaymentArgs, allowed_roles=["super_admin", "admin", "finance"]),
    AiTool("approveLeaveRequest", "write",
           "Propose approving a leave request. Args: { leaveRequestId, comments? }. Look up the request first with listLeaveRequests to get its document id. Never propose this for the requesting user's own leave request.",
           s.LeaveDecisionArgs, allowed_roles=["super_admin", "admin", "hr"]),
    AiTool("rejectLeaveRequest", "write",
           "Propose rejecting a leave request. Args: { leaveRequestId, comments? }. Never propose this for the requesting user's own leave request.",
           s.LeaveDecisionArgs, allowed_roles=["super_admin", "admin", "hr"]),
    AiTool("updateEmployeeRecord", "write",
           "Propose updating an employee's HR record — role/status/reporting fields only, never pay or bank details (this assistant can't touch those). Args: { employeeId, fullName?, department?, designation?, employmentType?, employeeStatus?, mobileNumber?, email?, reportingManagerId?, functionalManagerId? }. Look up the employee first with getEmployeeById to get their document id.",
           s.UpdateEmployeeArgs, allowed_roles=["super_admin", "admin", "hr"]),
    AiTool("createCustomer", "write",
           "Propose creating a new customer. Args: { fullName, phone, customerType, source, officeId, officeName, email?, alternatePhone?, city?, address?, assignedTo?, agentName?, notes? }.",
           s.CustomerArgs, allowed_roles=None),
    AiTool("updateCustomer", "write",
           "Propose updating an existing customer's contact/profile fields. Args: { customerId, fullName?, email?, phone?, city?, address?, notes? }. Never propose changing who the customer is assigned to — that's a separate reassignment action not exposed here.",
           s.UpdateCustomerArgs, allowed_roles=["super_admin", "admin", "sales_head"]),
]

_BY_NAME = {tool.name: tool for tool in AI_TOOLS}


def get_tool(name: str) -> Optional[AiTool]:
    return _BY_NAME.get(name)


def describe_tools_for_prompt() -> str:
    return "\n".join(f"- {t.name} ({t.kind}): {t.description}" for t in AI_TOOLS)
