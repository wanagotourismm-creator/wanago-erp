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
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Type

from pydantic import BaseModel

from . import lead_score
from . import schemas as s
from .firestore_client import get_db
from .gemini_client import generate_text

MAX_LIST_RESULTS = 15
OPEN_LEAD_STAGES = {"new", "contacted", "follow_up", "quoted", "negotiation"}
FINAL_LEAD_STAGES = {"won", "lost"}
STUCK_DEAL_DAYS_THRESHOLD = 7


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


# ── searchResolvedIssues ────────────────────────────────────────
# Same keyword-scoring shape as search_help_articles, against the
# resolvedTicketKnowledge collection populated by
# /api/tickets/[id]/summarize-resolution whenever a ticket is resolved with
# notes (src/modules/tickets/services/ticket.service.ts's
# resolveTicketWithNotes). This is the "learns automatically" loop: the more
# tickets get resolved, the more this tool has to find — no model training,
# just a growing searchable history of real fixes.
def search_resolved_issues(args: s.SearchHelpArticlesArgs) -> Dict[str, Any]:
    db = get_db()
    if not db:
        return {"issues": []}
    query_tokens = _tokenize(args.query)
    scored = []
    for d in db.collection("resolvedTicketKnowledge").stream():
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
            scored.append((score, {
                "title": data.get("title"), "summary": data.get("content"),
                "sourceTicketRef": data.get("sourceTicketRef"),
            }))
    scored.sort(key=lambda x: x[0], reverse=True)
    return {"issues": [a for _, a in scored[:3]]}


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


# ── Sales engine ─────────────────────────────────────────────────
# getLeadPriorityRanking bulk-fetches leads/callLogs/quotations ONCE each
# (same shape as every other list tool here) rather than doing a per-lead
# call-log query — command-center.service.ts's own comment on
# computeLeadClosability explicitly flags a per-lead fetch loop as an N+1
# query explosion across the whole leads collection, so this follows its
# bulk-fetch-then-group-in-memory pattern instead.
def get_lead_priority_ranking(args: s.GetLeadPriorityRankingArgs) -> Dict[str, Any]:
    wheres = [("assignedTo", "==", args.assignedTo)] if args.assignedTo else []
    leads = [l for l in query_collection("leads", wheres) if l.get("stage") in OPEN_LEAD_STAGES]

    logs_by_lead: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for log in query_collection("callLogs", []):
        lid = log.get("leadId")
        if lid:
            logs_by_lead[lid].append(log)

    quote_by_lead: Dict[str, Dict[str, Any]] = {}
    for q in query_collection("quotations", []):
        lid = q.get("leadId")
        if not lid:
            continue
        existing = quote_by_lead.get(lid)
        if not existing or _ms(q.get("createdAt")) > _ms(existing.get("createdAt")):
            quote_by_lead[lid] = q

    scored = []
    for lead in leads:
        closability = lead_score.compute_lead_closability(
            stage=lead.get("stage", "new"), priority=lead.get("priority") or "",
            call_logs=logs_by_lead.get(lead["id"], []), quotation=quote_by_lead.get(lead["id"]),
            created_at=lead.get("createdAt"),
        )
        scored.append({
            "refNumber": lead.get("refNumber"), "name": lead.get("name"), "phone": lead.get("phone"),
            "stage": lead.get("stage"), "assignedTo": lead.get("assignedTo"),
            "score": closability["score"], "band": closability["band"], "reasons": closability["reasons"],
        })
    scored.sort(key=lambda item: item["score"], reverse=True)
    return {"leads": scored[:MAX_LIST_RESULTS]}


def get_package_pricing(args: s.GetPackagePricingArgs) -> Dict[str, Any]:
    wheres: List[tuple] = [("packageStatus", "==", "active")]
    if args.destination:
        wheres.append(("destination", "==", args.destination))
    docs = query_collection("packages", wheres)[:MAX_LIST_RESULTS]
    return {"packages": [
        {"refNumber": p.get("refNumber"), "title": p.get("title"), "destination": p.get("destination"),
         "durationDays": p.get("durationDays"), "durationNights": p.get("durationNights"),
         "basePrice": p.get("basePrice"), "inclusions": p.get("inclusions")} for p in docs
    ]}


def draft_follow_up_message(args: s.DraftFollowUpMessageArgs) -> Dict[str, Any]:
    lead = find_by_ref_or_id("leads", args.refNumberOrId)
    if not lead:
        return {"draftText": None, "error": "Lead not found"}
    prompt = (
        f"Write a short, friendly WhatsApp follow-up message to {lead.get('name')}, who inquired about a trip to "
        f"{lead.get('destination')}. Current pipeline stage: {lead.get('stage')}. "
        + (f"Tone: {args.tone}. " if args.tone else "")
        + "Keep it under 300 characters, plain text only, no links. This is a DRAFT for the sales rep to review "
          "and send manually — never claim it has been sent."
    )
    result = generate_text(feature="ai-employee-followup-draft", prompt=prompt, created_by="system")
    return {"leadName": lead.get("name"), "draftText": result["text"]}


# Deterministic (no ML) win-rate/stuck-deal aggregation — same "honesty
# first, report the sample size" stance as insights.service.ts and
# forecast.py's own thresholds, rather than a confident-looking percentage
# built on 2 leads.
def get_pipeline_analytics(args: s.GetPipelineAnalyticsArgs) -> Dict[str, Any]:
    wheres = [("officeId", "==", args.officeId)] if args.officeId else []
    leads = query_collection("leads", wheres)

    def win_rate_table(key_fn: Callable[[Dict[str, Any]], Any]) -> List[Dict[str, Any]]:
        counts: Dict[str, Dict[str, int]] = defaultdict(lambda: {"won": 0, "lost": 0})
        for lead in leads:
            stage = lead.get("stage")
            if stage in FINAL_LEAD_STAGES:
                counts[key_fn(lead) or "Unknown"][stage] += 1
        rows = []
        for key, c in counts.items():
            total = c["won"] + c["lost"]
            if total == 0:
                continue
            rows.append({"key": key, "won": c["won"], "lost": c["lost"], "winRate": round(c["won"] / total, 2), "sampleSize": total})
        rows.sort(key=lambda r: r["sampleSize"], reverse=True)
        return rows[:10]

    logs_by_lead: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for log in query_collection("callLogs", []):
        lid = log.get("leadId")
        if lid:
            logs_by_lead[lid].append(log)

    stuck = []
    for lead in leads:
        if lead.get("stage") not in OPEN_LEAD_STAGES:
            continue
        lead_logs = sorted(logs_by_lead.get(lead["id"], []), key=lambda l: _ms(l.get("createdAt")), reverse=True)
        last_contact = lead_logs[0].get("createdAt") if lead_logs else lead.get("createdAt")
        last_contact_ms = _ms(last_contact)
        if not last_contact_ms:
            continue
        days_since = (time.time() - last_contact_ms) / 86400
        if days_since >= STUCK_DEAL_DAYS_THRESHOLD:
            stuck.append({"refNumber": lead.get("refNumber"), "name": lead.get("name"),
                          "stage": lead.get("stage"), "daysSinceContact": int(days_since)})
    stuck.sort(key=lambda item: item["daysSinceContact"], reverse=True)

    return {
        "winRateBySource": win_rate_table(lambda l: l.get("source")),
        "winRateByDestination": win_rate_table(lambda l: l.get("destination")),
        "winRateByAgent": win_rate_table(lambda l: l.get("agentName") or l.get("assignedTo")),
        "stuckDeals": stuck[:15],
        "note": "Win rates only include leads already marked won/lost; small sampleSize values are noisy, say so "
                "rather than stating a confident percentage. Stuck deals = open-stage leads with no contact in "
                f"{STUCK_DEAL_DAYS_THRESHOLD}+ days.",
    }


# ── draftCampaignMessage ────────────────────────────────────────
# Content generation, not a database read or write — modeled as a "read"
# tool (no Firestore proposal/confirm needed) since there's nothing to
# persist: it returns copy text for a human marketer to review and send
# manually through the existing WhatsApp send flow.
#
# Grounded on real offers (src/modules/admin/offers/, Admin > Offers) the
# same way the customer-facing WhatsApp agent is
# (whatsapp-ai-reply.service.ts) — this tool must never invent a discount
# any more than that one may.
def _active_offers_text() -> str:
    import datetime as _dt
    today = _dt.date.today().isoformat()
    db = get_db()
    if not db:
        return "(no active offers on file — do not mention any discount or promotion)"
    offers = []
    for d in db.collection("offers").where("isActive", "==", True).stream():
        data = d.to_dict() or {}
        if str(data.get("validFrom", "")) <= today <= str(data.get("validTo", "")):
            dest = data.get("destination") or "all destinations"
            offers.append(f"- {data.get('title')} ({dest}): {data.get('description')}")
    return "\n".join(offers) if offers else "(no active offers on file — do not mention any discount or promotion)"


# ── draftReferralMessage ─────────────────────────────────────────
# Same "AI drafts, human sends" contract as draftCampaignMessage — Meta
# doesn't allow no-click bulk WhatsApp sends, and the existing referral
# flow (ShareKitModal.tsx) is already a human clicking a wa.me link with a
# prefilled message; this just makes that prefilled message AI-written
# instead of hand-typed, using the customer's real referralCode (never
# invented — the tool fails honestly if the customer has none on file).
def draft_referral_message(args: s.DraftReferralMessageArgs) -> Dict[str, Any]:
    customer = find_by_ref_or_id("customers", args.refNumberOrId)
    if not customer:
        return {"draftText": None, "error": "Customer not found"}
    referral_code = customer.get("referralCode")
    if not referral_code:
        return {"draftText": None, "error": "This customer has no referral code on file"}
    prompt = (
        f"Write a short, warm WhatsApp message to {customer.get('fullName')} asking them to refer a friend or "
        f"family member, mentioning their personal referral code '{referral_code}'. "
        + (f"Tone: {args.tone}. " if args.tone else "")
        + "Keep it under 300 characters, plain text only, no links. This is a DRAFT for the sales rep to review "
          "and send manually via WhatsApp — never claim it has been sent."
    )
    result = generate_text(feature="ai-employee-referral-draft", prompt=prompt, created_by="system")
    return {"customerName": customer.get("fullName"), "referralCode": referral_code, "draftText": result["text"]}


def draft_campaign_message(args: s.DraftCampaignMessageArgs) -> Dict[str, Any]:
    prompt = (
        f"Write a short, warm WhatsApp marketing message about: {args.campaignTopic}. "
        + (f"Audience: {args.audienceDescription}. " if args.audienceDescription else "")
        + (f"Tone: {args.tone}. " if args.tone else "")
        + "Keep it under 300 characters, plain text only (no markdown, no links unless one was given). "
          "Only mention a discount/offer if one is listed below — never invent one. "
          "This is a DRAFT for a human marketer to review before sending — never claim it has been sent.\n\n"
          f"Active offers/discounts:\n{_active_offers_text()}"
    )
    result = generate_text(feature="ai-employee-campaign-draft", prompt=prompt, created_by="system")
    return {"draftText": result["text"]}


# ── listSuspiciousAttendance ────────────────────────────────────
# Reason codes come from src/lib/geo-fraud.ts's SuspicionReason union — kept
# as a literal copy of SUSPICION_REASON_LABELS from that file rather than an
# import (TS/Python can't share a module) since it's a small, stable, 3-item
# enum. If geo-fraud.ts's reasons ever change, update this too.
SUSPICION_REASON_LABELS = {
    "accuracy_too_precise": "GPS accuracy was suspiciously exact for a consumer device (possible location spoofing)",
    "impossible_travel_speed": "Implied travel speed since their last recorded position is physically impossible",
    "identical_coordinates_repeated": "Reported the exact same coordinates as several recent attempts in a row",
}


def list_suspicious_attendance(args: s.ListSuspiciousAttendanceArgs) -> Dict[str, Any]:
    wheres = []
    if args.employeeId: wheres.append(("employeeId", "==", args.employeeId))
    if args.reviewed is not None: wheres.append(("reviewed", "==", args.reviewed))
    docs = sort_by_created_at_desc(query_collection("hrmsSuspiciousAttendance", wheres))[:MAX_LIST_RESULTS]
    return {"attempts": [
        {
            "employeeName": d.get("employeeName"), "action": d.get("action"), "officeName": d.get("officeName"),
            "reviewed": d.get("reviewed"),
            "reasons": [SUSPICION_REASON_LABELS.get(r, r) for r in (d.get("reasons") or [])],
        } for d in docs
    ]}


# ── checkInvoiceGstMath ──────────────────────────────────────────
# Deterministic, not LLM-based — same "rule-based where reliable" stance as
# lead_score.py and get_pipeline_analytics. Mirrors the exact tax-inclusive
# formula in src/modules/invoices/components/InvoiceForm.tsx
# (computedTaxAmount = totalAmount * (taxRate/(100+taxRate))) — the same
# formula whose earlier bug is why this check exists at all.
def check_invoice_gst_math(args: s.RefLookupArgs) -> Dict[str, Any]:
    invoice = find_by_ref_or_id("invoices", args.refNumberOrId)
    if not invoice:
        return {"error": "Invoice not found"}
    total = invoice.get("totalAmount") or 0
    tax_rate = invoice.get("taxRate")
    if tax_rate is None:
        return {"refNumber": invoice.get("refNumber"), "note": "No tax rate set on this invoice - nothing to check."}
    expected_tax = round(total * (tax_rate / (100 + tax_rate)), 2)
    stored_tax = invoice.get("taxAmount")
    stored = round(stored_tax, 2) if stored_tax is not None else None
    mismatch = stored is None or abs(stored - expected_tax) > 1.0
    return {
        "refNumber": invoice.get("refNumber"), "totalAmount": total, "taxRate": tax_rate,
        "storedTaxAmount": stored, "expectedTaxAmount": expected_tax, "mismatch": mismatch,
    }


# ── mineTestimonials ─────────────────────────────────────────────
def mine_testimonials(args: s.MineTestimonialsArgs) -> Dict[str, Any]:
    wheres: List[tuple] = [("category", "==", "promoter")]
    if args.destination: wheres.append(("destination", "==", args.destination))
    docs = query_collection("npsResponses", wheres)
    quotes = [d for d in docs if d.get("comment") and len(d.get("comment", "")) > 15]
    quotes.sort(key=lambda d: d.get("score", 0), reverse=True)
    return {"testimonials": [
        {"customerName": d.get("customerName"), "destination": d.get("destination"),
         "score": d.get("score"), "quote": d.get("comment")} for d in quotes[:MAX_LIST_RESULTS]
    ]}


# ── suggestTicketPriority ────────────────────────────────────────
# Free-text suggestion (not a machine-actioned field write) — the assistant
# relays this to whoever's filing/triaging the ticket, it never sets
# ticket.priority itself.
def suggest_ticket_priority(args: s.SuggestTicketPriorityArgs) -> Dict[str, Any]:
    prompt = (
        f'A support ticket was filed with title: "{args.title}" and description: "{args.description}".\n'
        "Suggest a priority (low, medium, high, or urgent) and give a one-sentence reason. "
        "urgent = blocks someone's work entirely or affects many people right now; "
        "high = significant impact on one person's ability to work; "
        "medium = annoying but has a workaround; low = cosmetic/non-blocking."
    )
    result = generate_text(feature="ai-employee-ticket-triage", prompt=prompt, created_by="system", max_output_tokens=120)
    return {"suggestion": result["text"]}


def draft_ticket_reply(args: s.DraftTicketReplyArgs) -> Dict[str, Any]:
    ticket = find_by_ref_or_id("tickets", args.refNumberOrId)
    if not ticket:
        return {"draftText": None, "error": "Ticket not found"}
    prompt = (
        "Draft a short, helpful reply to this support ticket for the assigned staff member to review and send.\n"
        f"Title: {ticket.get('title')}\nDescription: {ticket.get('description')}\n"
        + (f"Context: {args.context}\n" if args.context else "")
        + "Keep it warm and specific, plain text, under 4 sentences. This is a DRAFT - never claim the issue is "
          "already resolved unless the context says so."
    )
    result = generate_text(feature="ai-employee-ticket-reply-draft", prompt=prompt, created_by="system")
    return {"ticketRef": ticket.get("refNumber"), "draftText": result["text"]}


# ── flagExpenseAnomalies ─────────────────────────────────────────
# Deterministic duplicate + statistical-outlier detection, same "rule-based
# where reliable" stance as the GST check above — fraud heuristics like
# these are cheaper, more auditable, and more reliable as plain code than an
# LLM guessing over a list of numbers.
def flag_expense_anomalies(args: s.FlagExpenseAnomaliesArgs) -> Dict[str, Any]:
    wheres = [("officeId", "==", args.officeId)] if args.officeId else []
    expenses = query_collection("expenses", wheres)

    seen: Dict[tuple, Optional[str]] = {}
    duplicates = []
    for e in expenses:
        key = (e.get("vendor"), e.get("amount"), e.get("expenseDate"))
        if key in seen:
            duplicates.append({
                "refNumber": e.get("refNumber"), "vendor": e.get("vendor"),
                "amount": e.get("amount"), "date": e.get("expenseDate"), "duplicateOfRef": seen[key],
            })
        else:
            seen[key] = e.get("refNumber")

    by_category: Dict[str, List[float]] = defaultdict(list)
    for e in expenses:
        amt = e.get("amount")
        if amt:
            by_category[e.get("category")].append(amt)

    outliers = []
    for e in expenses:
        cat = e.get("category")
        amounts = by_category.get(cat, [])
        if len(amounts) < 3:
            continue
        avg = sum(amounts) / len(amounts)
        if avg > 0 and (e.get("amount") or 0) > avg * 3:
            outliers.append({
                "refNumber": e.get("refNumber"), "category": cat,
                "amount": e.get("amount"), "categoryAverage": round(avg, 2),
            })

    return {
        "duplicates": duplicates[:MAX_LIST_RESULTS], "outliers": outliers[:MAX_LIST_RESULTS],
        "note": "Duplicates = same vendor+amount+date. Outliers = more than 3x the category average, and needs "
                "at least 3 expenses already in that category to have a meaningful average to compare against.",
    }


# ── getEmployeePerformance ───────────────────────────────────────
# Read-only by design — src/modules/performance/reviews/ already has a
# careful "polish, never invent" AI assistant
# (review-ai.service.ts/polishReviewNotes) for actually drafting review
# content, and firestore.rules flags these two collections as "sensitive HR
# data" (hr/admin-only). Adding a second, competing AI path that could
# create/fabricate a review would undercut that deliberate design, so this
# tool only surfaces existing goals/review history for context — never
# proposes creating one.
def get_employee_performance(args: s.GetEmployeePerformanceArgs) -> Dict[str, Any]:
    employee = find_by_ref_or_id("hrmsEmployees", args.refNumberOrId)
    if not employee:
        return {"error": "Employee not found"}
    goals = sort_by_created_at_desc(query_collection("performanceGoals", [("employeeId", "==", employee["id"])]))[:10]
    reviews = sort_by_created_at_desc(query_collection("performanceReviews", [("employeeId", "==", employee["id"])]))[:5]
    return {
        "employeeName": employee.get("fullName"),
        "goals": [{"title": g.get("title"), "progress": g.get("progress"), "status": g.get("status"),
                   "dueDate": g.get("dueDate")} for g in goals],
        "reviews": [{"period": r.get("period"), "rating": r.get("rating"), "reviewType": r.get("reviewType"),
                    "status": r.get("status")} for r in reviews],
    }


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
    AiTool("searchResolvedIssues", "read",
           "Search the history of previously-resolved IT/software support tickets for a fix matching this problem — always check this before assuming something is new. Args: { query: string }.",
           s.SearchHelpArticlesArgs, run=search_resolved_issues),
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
    AiTool("getLeadPriorityRanking", "read",
           "Rank open leads hot-to-cold using the exact same closability score shown on the Lead Detail page (not a separate/competing score). Args: { assignedTo?: string (uid, scope to one rep) }.",
           s.GetLeadPriorityRankingArgs, run=get_lead_priority_ranking, allowed_roles=["super_admin", "admin", "sales", "sales_head"]),
    AiTool("getPackagePricing", "read",
           "Look up real package pricing (base price, duration, inclusions) before proposing quotation line items — never invent prices. Args: { destination?: string }.",
           s.GetPackagePricingArgs, run=get_package_pricing, allowed_roles=["super_admin", "admin", "sales", "sales_head"]),
    AiTool("draftFollowUpMessage", "read",
           "Draft a short WhatsApp follow-up message for one lead, for the sales rep to review and send manually — this NEVER sends anything. Args: { refNumberOrId: string, tone?: string }.",
           s.DraftFollowUpMessageArgs, run=draft_follow_up_message, allowed_roles=["super_admin", "admin", "sales", "sales_head"]),
    AiTool("getPipelineAnalytics", "read",
           "Win-rate by source/destination/agent and stuck-deal (no-contact) detection across the sales pipeline. Always reports sample sizes — treat any winRate on a small sampleSize as noisy, not a confident trend. Args: { officeId?: string }.",
           s.GetPipelineAnalyticsArgs, run=get_pipeline_analytics, allowed_roles=["super_admin", "admin", "sales", "sales_head"]),
    AiTool("draftReferralMessage", "read",
           "Draft a WhatsApp message asking a specific customer to refer a friend, using their real referral code — for the sales rep to review and send manually (never sends anything itself). Args: { refNumberOrId: string (customer), tone?: string }.",
           s.DraftReferralMessageArgs, run=draft_referral_message, allowed_roles=["super_admin", "admin", "sales", "sales_head"]),
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
    AiTool("listSuspiciousAttendance", "read",
           "List flagged suspicious attendance attempts with plain-language reasons (not raw codes), optionally filtered. Args: { employeeId?: string, reviewed?: boolean }.",
           s.ListSuspiciousAttendanceArgs, run=list_suspicious_attendance, allowed_roles=["super_admin", "admin", "hr"]),
    AiTool("checkInvoiceGstMath", "read",
           "Deterministically check whether an invoice's stored tax amount matches what the tax-inclusive GST formula actually produces — use this before telling anyone an invoice's tax figures are correct. Args: { refNumberOrId: string }.",
           s.RefLookupArgs, run=check_invoice_gst_math, allowed_roles=["super_admin", "admin", "finance"]),
    AiTool("mineTestimonials", "read",
           "Find real positive customer quotes (from NPS promoter responses) usable in marketing/referral material — never invent a testimonial. Args: { destination?: string }.",
           s.MineTestimonialsArgs, run=mine_testimonials, allowed_roles=["super_admin", "admin", "marketing"]),
    AiTool("suggestTicketPriority", "read",
           "Suggest a priority level (with reasoning) for a support ticket based on its title/description — purely advisory, never sets the ticket's actual priority field. Args: { title: string, description: string }.",
           s.SuggestTicketPriorityArgs, run=suggest_ticket_priority),
    AiTool("draftTicketReply", "read",
           "Draft a short reply to a support ticket for the assigned staff member to review and send manually — this NEVER sends anything. Args: { refNumberOrId: string, context?: string }.",
           s.DraftTicketReplyArgs, run=draft_ticket_reply),
    AiTool("flagExpenseAnomalies", "read",
           "Deterministically flag likely-duplicate or statistically-outlier expenses for a human to double-check — never accuses anyone of fraud, just surfaces what needs a second look. Args: { officeId?: string }.",
           s.FlagExpenseAnomaliesArgs, run=flag_expense_anomalies, allowed_roles=["super_admin", "admin", "finance"]),
    AiTool("getEmployeePerformance", "read",
           "Look up an employee's recent goals and performance-review history (ratings/status only, not full review text) for context — never used to draft or create a new review. Args: { refNumberOrId: string }.",
           s.GetEmployeePerformanceArgs, run=get_employee_performance, allowed_roles=["super_admin", "admin", "hr"]),
    AiTool("createItinerary", "write",
           "Propose creating a full day-by-day itinerary — write real, specific day titles/descriptions for the given destination and duration yourself (don't leave them generic). Args: { title, destination, durationDays, days: [{dayNumber, title, description}], officeId, officeName, tripType?, tagline?, inclusions?: string[], exclusions?: string[], notes? }.",
           s.CreateItineraryArgs, allowed_roles=["super_admin", "admin", "operations", "sales"]),
]

_BY_NAME = {tool.name: tool for tool in AI_TOOLS}


def get_tool(name: str) -> Optional[AiTool]:
    return _BY_NAME.get(name)


def describe_tools_for_prompt() -> str:
    return "\n".join(f"- {t.name} ({t.kind}): {t.description}" for t in AI_TOOLS)
