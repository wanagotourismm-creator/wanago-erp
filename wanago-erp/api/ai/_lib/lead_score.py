# Direct port of src/modules/leads/services/lead-score.service.ts's
# computeLeadClosability() + the getQuotationRisk() slice of
# src/modules/dashboard/services/insights.service.ts it depends on. Pure
# function, no Firestore access here (mirrors the TS split: lead-score
# service is pure, the caller does the fetching) — kept byte-for-byte
# equivalent in formula so a lead's score here never quietly drifts from
# what LeadDetailModal shows in the browser. If lead-score.service.ts's
# formula changes, this needs the same change.
import datetime
from typing import Any, Dict, List, Optional

DAY_S = 24 * 60 * 60
HOUR_S = 60 * 60
SPEED_TO_LEAD_GRACE_HOURS = 1

STAGE_POINTS = {"new": 10, "contacted": 25, "follow_up": 20, "quoted": 45, "negotiation": 65}

QUOTATION_EXPIRY_WARNING_DAYS = 2
QUOTATION_STALE_DAYS = 5


def _band_for(score: int) -> str:
    if score >= 70: return "hot"
    if score >= 45: return "warm"
    if score >= 25: return "at_risk"
    return "cold"


def _to_dt(value: Any) -> Optional[datetime.datetime]:
    if value is None:
        return None
    if isinstance(value, datetime.datetime):
        return value if value.tzinfo else value.replace(tzinfo=datetime.timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _get_quotation_risk(status: str, valid_until: Optional[str], updated_at: Any) -> Optional[Dict[str, str]]:
    if status != "sent":
        return None
    if valid_until:
        valid_until_dt = _to_dt(valid_until)
        if valid_until_dt:
            days_until_expiry = (valid_until_dt - _now()).total_seconds() / DAY_S
            if days_until_expiry < 0:
                return {"type": "expired", "label": "Expired"}
            if days_until_expiry <= QUOTATION_EXPIRY_WARNING_DAYS:
                return {"type": "expiring", "label": "Expiring soon"}
    updated_dt = _to_dt(updated_at)
    if updated_dt:
        days_since = (_now() - updated_dt).total_seconds() / DAY_S
        if days_since >= QUOTATION_STALE_DAYS:
            return {"type": "stale", "label": f"No response {int(days_since)}d"}
    return None


def compute_lead_closability(
    *, stage: str, priority: str, call_logs: List[Dict[str, Any]],
    quotation: Optional[Dict[str, Any]], created_at: Any,
) -> Dict[str, Any]:
    score = STAGE_POINTS.get(stage, 10)
    reasons: List[str] = []

    if stage in ("quoted", "negotiation"):
        reasons.append("In active negotiation" if stage == "negotiation" else "Quotation stage — actively pricing")

    if quotation:
        q_status = quotation.get("status")
        if q_status in ("accepted", "converted"):
            score += 35
            reasons.append("Quotation accepted")
        elif q_status in ("rejected", "expired"):
            score -= 20
            reasons.append("Quotation was rejected" if q_status == "rejected" else "Quotation expired")
        elif q_status == "sent":
            risk = _get_quotation_risk(q_status, quotation.get("validUntil"), quotation.get("updatedAt"))
            risk_type = risk["type"] if risk else None
            if risk_type == "stale":
                score -= 15
                reasons.append(f"Quotation sent, {risk['label'].lower()}")
            elif risk_type == "expired":
                score -= 15
                reasons.append("Quotation expired")
            elif risk_type == "expiring":
                score += 20
                reasons.append("Quotation expiring soon — follow up now")
            else:
                score += 25
                reasons.append("Quotation sent — awaiting response")
        else:
            score += 5  # draft

    call_logs_sorted = sorted(call_logs, key=lambda l: (_to_dt(l.get("createdAt")) or datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)), reverse=True)
    last_log = call_logs_sorted[0] if call_logs_sorted else None
    last_contact_dt = _to_dt(last_log.get("createdAt")) if last_log else None

    if last_contact_dt:
        days_since = (_now() - last_contact_dt).total_seconds() / DAY_S
        if days_since <= 2:
            score += 20
        elif days_since <= 5:
            score += 10
        elif days_since <= 10:
            pass
        else:
            score -= 15
            reasons.append(f"No contact in {int(days_since)} days")
    else:
        lead_created_dt = _to_dt(created_at)
        hours_open = (_now() - lead_created_dt).total_seconds() / HOUR_S if lead_created_dt else 0
        if hours_open < SPEED_TO_LEAD_GRACE_HOURS:
            pass
        elif hours_open < 24:
            score -= 10
            reasons.append(f"No contact yet — {int(hours_open)}h since it came in")
        else:
            score -= 20
            reasons.append(f"No contact yet — {int(hours_open / 24)}d since it came in")

    if last_log:
        outcome = last_log.get("outcome")
        if outcome == "connected":
            score += 15
        elif outcome in ("no_answer", "busy"):
            score -= 5
            reasons.append(f"Last call: {outcome.replace('_', ' ')}")
        elif outcome == "wrong_number":
            score -= 20
            reasons.append("Last call: wrong number")

    if priority == "hot":
        score += 10
    elif priority == "cold":
        score -= 10

    score = max(0, min(100, round(score)))
    return {"score": score, "band": _band_for(score), "reasons": reasons[:3]}
