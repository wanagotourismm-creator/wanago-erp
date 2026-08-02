# Python port of src/modules/ai-core/services/geminiService.ts — same
# Gemini-primary/Groq-fallback REST calls, same settings/aiSettings doc
# (independent 60s-TTL cache, mirroring the TS side's own separate cache —
# the two were never shared even before this service existed), same
# 15s-per-provider timeout, same "thinking disabled" Gemini config. Kept
# parallel to the TS version deliberately so the two never quietly drift
# apart on model choice or fallback behavior.
import json
import os
import time
from typing import Any, Dict, List, Optional

import requests

from .firestore_client import get_db
from .usage_log import log_ai_usage

DEFAULT_AI_SETTINGS: Dict[str, Any] = {
    "geminiModel": "gemini-3.5-flash",
    "groqModel": "llama-3.3-70b-versatile",
    "temperature": 0.2,
    "maxOutputTokens": 500,
    "aiEmployeeEnabled": True,
}

PROVIDER_TIMEOUT_S = 15
SETTINGS_TTL_S = 60

_cached_settings: Optional[Dict[str, Any]] = None
_cached_at: float = 0.0


class AiGenerationError(Exception):
    pass


def get_settings() -> Dict[str, Any]:
    global _cached_settings, _cached_at
    if _cached_settings is not None and (time.time() - _cached_at) < SETTINGS_TTL_S:
        return _cached_settings
    try:
        db = get_db()
        doc = db.collection("settings").document("aiSettings").get() if db else None
        data = doc.to_dict() if doc is not None and doc.exists else {}
        value = {**DEFAULT_AI_SETTINGS, **(data or {})}
        _cached_settings = value
        _cached_at = time.time()
        return value
    except Exception:
        return DEFAULT_AI_SETTINGS


def _build_contents(history: Optional[List[Dict[str, str]]], prompt: str) -> List[Dict[str, Any]]:
    contents: List[Dict[str, Any]] = []
    for h in history or []:
        role = "model" if h.get("role") == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": h.get("content", "")}]})
    contents.append({"role": "user", "parts": [{"text": prompt}]})
    return contents


def _call_gemini(
    api_key: str, model: str, system: Optional[str], contents: List[Dict[str, Any]],
    temperature: float, max_output_tokens: int, response_schema: Optional[Dict[str, Any]] = None,
) -> str:
    generation_config: Dict[str, Any] = {
        "maxOutputTokens": max_output_tokens,
        "temperature": temperature,
        # Same rationale as geminiService.ts: gemini-3.5-flash burns its
        # token budget on invisible "thinking" tokens unless this is off.
        "thinkingConfig": {"thinkingBudget": 0},
    }
    if response_schema:
        generation_config["responseMimeType"] = "application/json"
        generation_config["responseSchema"] = response_schema

    body: Dict[str, Any] = {"contents": contents, "generationConfig": generation_config}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}

    res = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
        json=body, timeout=PROVIDER_TIMEOUT_S,
    )
    if not res.ok:
        raise AiGenerationError(f"Gemini API error: {res.status_code}")
    data = res.json()
    candidates = data.get("candidates") or [{}]
    parts = (candidates[0].get("content") or {}).get("parts") or [{}]
    text = parts[0].get("text")
    if not text:
        raise AiGenerationError("Empty response from Gemini")
    if candidates[0].get("finishReason") == "MAX_TOKENS":
        raise AiGenerationError("Response truncated (hit maxOutputTokens)")
    return text


def _call_groq(
    api_key: str, model: str, system: Optional[str], history: Optional[List[Dict[str, str]]],
    prompt: str, temperature: float, max_output_tokens: int, json_mode: bool = False,
) -> str:
    messages: List[Dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    for h in history or []:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": prompt})

    body: Dict[str, Any] = {
        "model": model, "max_tokens": max_output_tokens, "temperature": temperature, "messages": messages,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    res = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"authorization": f"Bearer {api_key}"}, json=body, timeout=PROVIDER_TIMEOUT_S,
    )
    if not res.ok:
        raise AiGenerationError(f"Groq API error: {res.status_code}")
    data = res.json()
    choices = data.get("choices") or [{}]
    text = (choices[0].get("message") or {}).get("content")
    if not text:
        raise AiGenerationError("Empty response from Groq")
    return text


def generate_text(
    *, feature: str, prompt: str, created_by: str, system: Optional[str] = None,
    history: Optional[List[Dict[str, str]]] = None, temperature: Optional[float] = None,
    max_output_tokens: Optional[int] = None,
) -> Dict[str, str]:
    settings = get_settings()
    temp = temperature if temperature is not None else settings["temperature"]
    max_tokens = max_output_tokens if max_output_tokens is not None else settings["maxOutputTokens"]
    gemini_key = os.environ.get("GEMINI_API_KEY")
    groq_key = os.environ.get("GROQ_API_KEY")

    if gemini_key:
        started = time.time()
        try:
            text = _call_gemini(gemini_key, settings["geminiModel"], system, _build_contents(history, prompt), temp, max_tokens)
            log_ai_usage(feature=feature, provider="gemini", model=settings["geminiModel"], outcome="success",
                         prompt_chars=len(prompt), response_chars=len(text),
                         latency_ms=int((time.time() - started) * 1000), created_by=created_by)
            return {"text": text, "provider": "gemini"}
        except Exception as err:
            log_ai_usage(feature=feature, provider="gemini", model=settings["geminiModel"], outcome="error",
                         error_message=str(err), prompt_chars=len(prompt), response_chars=0,
                         latency_ms=int((time.time() - started) * 1000), created_by=created_by)

    if groq_key:
        started = time.time()
        try:
            text = _call_groq(groq_key, settings["groqModel"], system, history, prompt, temp, max_tokens)
            log_ai_usage(feature=feature, provider="groq", model=settings["groqModel"], outcome="success",
                         prompt_chars=len(prompt), response_chars=len(text),
                         latency_ms=int((time.time() - started) * 1000), created_by=created_by)
            return {"text": text, "provider": "groq"}
        except Exception as err:
            log_ai_usage(feature=feature, provider="groq", model=settings["groqModel"], outcome="error",
                         error_message=str(err), prompt_chars=len(prompt), response_chars=0,
                         latency_ms=int((time.time() - started) * 1000), created_by=created_by)

    raise AiGenerationError("No AI provider available - check GEMINI_API_KEY / GROQ_API_KEY.")


def generate_structured(
    *, feature: str, prompt: str, response_schema: Dict[str, Any], created_by: str,
    system: Optional[str] = None, history: Optional[List[Dict[str, str]]] = None,
    temperature: Optional[float] = None, max_output_tokens: Optional[int] = None,
) -> Dict[str, Any]:
    settings = get_settings()
    temp = temperature if temperature is not None else settings["temperature"]
    max_tokens = max_output_tokens if max_output_tokens is not None else settings["maxOutputTokens"]
    gemini_key = os.environ.get("GEMINI_API_KEY")
    groq_key = os.environ.get("GROQ_API_KEY")
    started = time.time()

    raw: Optional[str] = None
    provider = "gemini"
    model = settings["geminiModel"]

    if gemini_key:
        try:
            raw = _call_gemini(gemini_key, settings["geminiModel"], system, _build_contents(history, prompt),
                                temp, max_tokens, response_schema=response_schema)
        except Exception:
            raw = None

    if not raw and groq_key:
        provider = "groq"
        model = settings["groqModel"]
        try:
            raw = _call_groq(groq_key, settings["groqModel"], system, history, prompt, temp, max_tokens, json_mode=True)
        except Exception:
            raw = None

    if not raw:
        log_ai_usage(feature=feature, provider=provider, model=model, outcome="error",
                     error_message="No AI provider available", prompt_chars=len(prompt), response_chars=0,
                     latency_ms=int((time.time() - started) * 1000), created_by=created_by)
        raise AiGenerationError("No AI provider available - check GEMINI_API_KEY / GROQ_API_KEY.")

    try:
        parsed = json.loads(raw)
        ok = True
    except Exception:
        parsed = None
        ok = False

    log_ai_usage(feature=feature, provider=provider, model=model, outcome="success" if ok else "error",
                 error_message=None if ok else "Response failed JSON parsing",
                 prompt_chars=len(prompt), response_chars=len(raw),
                 latency_ms=int((time.time() - started) * 1000), created_by=created_by)

    if not ok:
        raise AiGenerationError("AI response failed JSON parsing")
    return parsed
