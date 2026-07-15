// Language type shared by the unified AI assistant's voice input/output
// (see src/modules/aiassistant) — the help-center-only getAIAnswer()
// function that used to live here was retired when the assistant was
// unified with live business data + HR grounding
// (src/modules/ai-core/services/ai-assistant-orchestrator.ts).
export type AILanguage = "en" | "ml";
