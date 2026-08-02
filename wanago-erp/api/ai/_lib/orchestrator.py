# Python port of src/modules/ai-core/services/ai-assistant-orchestrator.ts —
# same MAX_ITERATIONS=4 decide/observe loop, same transcript-folded-into-
# prompt approach (tool results go into `prompt`, never into `history`, so
# the strict user/assistant alternation Gemini expects in history is never
# broken), same call_tool/propose_write/respond action shape. This is the
# Vercel Python function's "brain"; wanago-erp/src/app/api/ai-assistant/
# route.ts proxies here and falls back to the original TS orchestrator if
# this call fails, so a Python-side outage never fully breaks the assistant.
import json
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from . import schemas as s
from . import tools as t
from .gemini_client import AiGenerationError, generate_structured, generate_text

MAX_ITERATIONS = 4
FEATURE = "unified-assistant-python"

LANGUAGE_NAMES = {"en": "English", "ml": "Malayalam"}

# leaveRequestId -> (collection, field storing the requesting employee's
# uid) — checked before returning a proposal so a self-approval attempt
# gets a clear refusal here rather than a cryptic Firestore permission
# error after the user clicks Confirm. firestore.rules'
# leaveOwnerWriteIsSafe() remains the real enforcement either way.
SELF_ACTION_GUARDED_TOOLS = {
    "approveLeaveRequest": ("hrmsLeaves", "employeeId"),
    "rejectLeaveRequest": ("hrmsLeaves", "employeeId"),
}


def _build_system_prompt(language: str, company_name: str) -> str:
    lang_name = LANGUAGE_NAMES.get(language, "English")
    return "\n".join([
        f"You are the unified {company_name} Assistant for {company_name}'s internal ERP.",
        "You help staff with three things: (1) how to use this ERP software, (2) HR and company policy questions, "
        "and (3) the business's live leads, quotations, invoices, bookings, payments, customers, employees and "
        "campaigns — and you can propose creating, approving, or updating records when asked.",
        "",
        f"Grounding rule: prefer calling a tool to look up real {company_name} data whenever the question could "
        f"plausibly be about {company_name}'s own records, documentation, or policy. If a tool returns nothing "
        f"relevant, or the question is general knowledge unrelated to {company_name}'s own data, answer from your "
        "own general knowledge instead — just make clear the answer isn't sourced from company data.",
        f"Never claim something is true about {company_name}'s data without having called a tool to check it first.",
        "",
        "Available tools:",
        t.describe_tools_for_prompt(),
        "",
        "To use a read tool, respond with action=\"call_tool\", toolName, and toolArgsJson (a JSON-encoded string "
        "of the tool's args). You'll be shown the result and can decide again.",
        "To propose a write (create, approve, reject, or update a record), respond with action=\"propose_write\", "
        "toolName, toolArgsJson, and a proposedSummary (one plain sentence, e.g. \"Approve leave request LV-0004 "
        "for Priya\"). You do NOT execute the write yourself — the user will be shown a confirm/cancel card, and "
        "you must never claim a record was created/approved/updated until a later tool result confirms it.",
        "When you have enough information (or none is needed), respond with action=\"respond\" and finalAnswer "
        "containing your full answer to the user, in plain text (no markdown headers or code fences).",
        "",
        "HR-specific facts you can state without a tool: Casual leave 12 days/year, Sick leave 12 days/year, "
        "Earned leave 15 days/year; Emergency leave and Work From Home are uncapped/case-by-case; Loss of Pay "
        "covers unpaid leave beyond other balances. Leave requests are approved by the employee's reporting "
        "manager, or HR/Admin as a fallback. If an uploaded policy document (via getHrPolicyContext) covers the "
        "same topic, its exact wording always wins over these general facts. You cannot perform HR actions on the "
        "employee's own behalf (apply leave, check in/out, submit corrections, request assets, file tickets) — "
        "tell the employee which button/tab on the My HR page to use instead.",
        "",
        "Never propose approving or rejecting a leave request for the person who is asking you — if the caller's "
        "own record would be affected, decline and explain that someone else (their manager or HR) needs to "
        "action it.",
        "",
        "Be concise, warm, and specific. Respond in plain text only.",
        f"Respond to the user ONLY in {lang_name}, regardless of what language any tool result or documentation "
        f"is written in — translate/rephrase the relevant content into {lang_name} yourself. (toolArgsJson and "
        "toolName values are never translated, only your finalAnswer/proposedSummary text.)",
    ])


def _build_loop_prompt(question: str, transcript: List[str]) -> str:
    if not transcript:
        return question
    return "\n".join([
        f"The user's question: {question}",
        "",
        "So far this turn:",
        *transcript,
        "",
        "Decide your next action.",
    ])


def _guard_self_action(tool_name: str, args: BaseModel, created_by: str) -> Optional[str]:
    guard = SELF_ACTION_GUARDED_TOOLS.get(tool_name)
    if not guard:
        return None
    collection, owner_field = guard
    record_id = getattr(args, "leaveRequestId", None)
    if not record_id:
        return None
    record = t.find_by_ref_or_id(collection, record_id)
    if record and record.get(owner_field) == created_by:
        return "You can't approve or reject your own leave request — please ask your reporting manager or HR to action it."
    return None


def run_assistant_turn(
    *, question: str, history: List[Dict[str, str]], created_by: str,
    caller_role: Optional[str], language: str = "en", company_name: str = "Wanago",
) -> Dict[str, Any]:
    system = _build_system_prompt(language, company_name)
    transcript: List[str] = []

    for _ in range(MAX_ITERATIONS):
        prompt = _build_loop_prompt(question, transcript)

        try:
            raw_decision = generate_structured(
                feature=FEATURE, prompt=prompt, system=system, history=history,
                created_by=created_by, response_schema=s.ASSISTANT_DECISION_RESPONSE_SCHEMA,
            )
            decision = s.AssistantDecision.model_validate(raw_decision)
        except AiGenerationError:
            raise
        except Exception:
            transcript.append(
                "(Your last response couldn't be parsed — respond again using the required "
                "action/toolName/toolArgsJson/finalAnswer shape.)"
            )
            continue

        if decision.action == "respond":
            text = (decision.finalAnswer or "").strip() or "I don't have an answer for that."
            return {"kind": "answer", "text": text}

        if decision.action == "call_tool":
            tool = t.get_tool(decision.toolName) if decision.toolName else None
            if not tool or tool.kind != "read":
                transcript.append(f'Tool "{decision.toolName or ""}" is not a valid read tool. Available tools are listed above.')
                continue
            if tool.allowed_roles and (not caller_role or caller_role not in tool.allowed_roles):
                transcript.append(
                    f'Tool "{tool.name}" needs one of these roles: {", ".join(tool.allowed_roles)}. '
                    "The caller does not have permission — do not retry this tool; if it was central to their "
                    "question, tell them directly instead of guessing."
                )
                continue
            try:
                raw_args = json.loads(decision.toolArgsJson) if decision.toolArgsJson else {}
            except Exception:
                transcript.append(f'Your toolArgsJson for "{tool.name}" wasn\'t valid JSON. Try again.')
                continue
            try:
                parsed_args = tool.args_model.model_validate(raw_args)
            except Exception as err:
                transcript.append(f'Your args for "{tool.name}" were invalid: {err}')
                continue
            try:
                result = tool.run(parsed_args)  # type: ignore[misc]
            except Exception as err:
                transcript.append(f'Tool "{tool.name}" failed: {err}')
                continue
            result_json = json.dumps(result, default=str)[:3000]
            args_json = json.dumps(json.loads(parsed_args.model_dump_json()))
            transcript.append(f'Tool "{tool.name}" called with {args_json} -> result: {result_json}')
            continue

        if decision.action == "propose_write":
            tool = t.get_tool(decision.toolName) if decision.toolName else None
            if not tool or tool.kind != "write":
                transcript.append(f'Tool "{decision.toolName or ""}" is not a valid write tool. Available tools are listed above.')
                continue
            try:
                raw_args = json.loads(decision.toolArgsJson) if decision.toolArgsJson else {}
            except Exception:
                transcript.append(f'Your toolArgsJson for "{tool.name}" wasn\'t valid JSON. Try again.')
                continue
            try:
                parsed_args = tool.args_model.model_validate(raw_args)
            except Exception as err:
                transcript.append(
                    f'Your args for "{tool.name}" were invalid: {err}. Fix them and propose again, or ask the '
                    "user for the missing details."
                )
                continue

            self_action_error = _guard_self_action(tool.name, parsed_args, created_by)
            if self_action_error:
                return {"kind": "answer", "text": self_action_error}

            if tool.allowed_roles and (not caller_role or caller_role not in tool.allowed_roles):
                return {
                    "kind": "answer",
                    "text": f"You don't have permission to do that ({tool.name}). That action needs one of these "
                            f"roles: {', '.join(tool.allowed_roles)}.",
                }

            summary = (decision.proposedSummary or "").strip() or f"Perform {tool.name}."
            return {
                "kind": "proposal", "tool": tool.name,
                "args": json.loads(parsed_args.model_dump_json()),
                "summary": summary,
            }

    # Loop cap exceeded — one plain-text answer rather than hanging or
    # surfacing an error for what's likely just an ambiguous question that
    # didn't resolve to a clean tool/answer path.
    text_result = generate_text(
        feature=f"{FEATURE}-fallback", prompt=question, history=history, created_by=created_by,
        system=f"You are the {company_name} Assistant for {company_name}'s ERP. Answer as best you can in plain "
               f"text, concisely, ONLY in {LANGUAGE_NAMES.get(language, 'English')}.",
    )
    return {"kind": "answer", "text": text_result["text"]}
