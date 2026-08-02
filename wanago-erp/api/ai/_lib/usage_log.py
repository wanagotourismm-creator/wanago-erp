# Writes aiUsageLogs docs matching the shape written by
# src/modules/ai-core/services/ai-usage-log.service.ts's logAiUsage() — same
# collection, same fields, so the existing Admin usage dashboard sees Python-
# served turns alongside TS-served ones with no changes needed on that side.
# Best-effort: never raises, mirroring logAiUsage's never-throw contract.
import datetime
from typing import Optional

from .firestore_client import get_db


def log_ai_usage(
    *,
    feature: str,
    provider: str,
    model: str,
    outcome: str,
    prompt_chars: int,
    response_chars: int,
    latency_ms: int,
    created_by: str,
    error_message: Optional[str] = None,
) -> None:
    try:
        db = get_db()
        if not db:
            return
        now = datetime.datetime.now(datetime.timezone.utc)
        db.collection("aiUsageLogs").add({
            "feature": feature,
            "provider": provider,
            "model": model,
            "outcome": outcome,
            "status": outcome,
            "errorMessage": error_message,
            "promptChars": prompt_chars,
            "responseChars": response_chars,
            "latencyMs": latency_ms,
            "createdBy": created_by,
            "createdAt": now,
            "updatedAt": now,
        })
    except Exception:
        pass
