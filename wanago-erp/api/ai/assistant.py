# Vercel-native Python serverless function (BaseHTTPRequestHandler
# convention — no framework needed, matching api/ml/forecast.py). This is
# the "AI employee" brain: wanago-erp/src/app/api/ai-assistant/route.ts
# verifies the caller's Firebase ID token (requireAuth) and checks the
# Admin > AI Employee master switch, then forwards
# {question, history, uid, role, language, companyName} here behind a
# shared secret (X-Internal-Secret / AI_INTERNAL_SECRET) — this function
# trusts that payload rather than re-verifying Firebase tokens itself,
# keeping Firebase Auth verification centralized in the one place that
# already does it (src/lib/firebase/admin.ts). See _lib/orchestrator.py for
# the actual decide/tool-call loop; response shape mirrors
# ai-assistant-orchestrator.ts's AssistantTurnResult exactly, so the Next.js
# proxy (and ultimately the browser) needs no special-casing.
import json
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))

from _lib.gemini_client import AiGenerationError  # noqa: E402
from _lib.orchestrator import run_assistant_turn  # noqa: E402


def _send_json(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload).encode()
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            secret = os.environ.get("AI_INTERNAL_SECRET")
            provided = self.headers.get("X-Internal-Secret")
            if not secret or provided != secret:
                _send_json(self, 401, {"error": "Unauthorized"})
                return

            content_length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(content_length) if content_length else b"{}"
            data = json.loads(raw or b"{}")

            question = str(data.get("question", "")).strip()[:1000]
            if not question:
                _send_json(self, 400, {"error": "No question provided"})
                return

            history = [
                {"role": h.get("role"), "content": str(h.get("content", ""))[:1000]}
                for h in (data.get("history") or [])[-10:]
                if h.get("role") in ("user", "assistant")
            ]
            language = data.get("language") if data.get("language") in ("en", "ml") else "en"
            created_by = str(data.get("uid") or "unknown")
            caller_role = data.get("role")
            company_name = str(data.get("companyName") or "Wanago")

            result = run_assistant_turn(
                question=question, history=history, created_by=created_by,
                caller_role=caller_role, language=language, company_name=company_name,
            )
            _send_json(self, 200, result)
        except AiGenerationError as err:
            _send_json(self, 501, {"error": f"AI provider unavailable: {err}"})
        except Exception as err:  # noqa: BLE001 — always return JSON, never a bare 500 HTML page
            _send_json(self, 502, {"error": str(err)})

    def do_GET(self):
        _send_json(self, 200, {"ok": True, "service": "wanago-ai-employee"})
