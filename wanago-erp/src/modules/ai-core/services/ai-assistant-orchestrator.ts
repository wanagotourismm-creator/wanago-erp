// Server-only. The unified assistant's agentic loop: decide -> run a read
// tool -> observe -> decide again (capped), or propose a write, or answer
// directly. Built on generateStructured() rather than either provider's
// native function-calling (neither is wired up in geminiService.ts, and
// Groq needs a fallback anyway) — same JSON-mode mechanism already proven
// by quotation-ai.service.ts.
//
// Tool-call observations are folded into the `prompt` string each
// iteration rather than appended to the ChatTurn `history` array, so the
// strict user/assistant alternation Gemini expects in `history` is never
// broken by an extra synthetic turn — `history` stays exactly the real
// prior conversation the client sent.
import { generateStructured, generateText, AiGenerationError, type ChatTurn } from "@/modules/ai-core/services/geminiService";
import { assistantDecisionSchema, assistantDecisionResponseSchema } from "@/modules/ai-core/schemas/assistant-decision.schema";
import { getTool, describeToolsForPrompt } from "@/modules/ai-core/services/ai-tools";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";

const MAX_ITERATIONS = 4;
const FEATURE = "unified-assistant";

export type AssistantTurnResult =
  | { kind: "answer"; text: string }
  | { kind: "proposal"; tool: string; args: unknown; summary: string };

const LANGUAGE_NAMES: Record<"en" | "ml", string> = { en: "English", ml: "Malayalam" };

function buildSystemPrompt(language: "en" | "ml", companyName: string): string {
  return [
    `You are the unified ${companyName} Assistant for ${companyName}'s internal ERP.`,
    "You help staff with three things: (1) how to use this ERP software, (2) HR and company policy questions, and (3) the business's live leads, quotations, invoices and customers — and you can create new leads or quotations when asked.",
    "",
    `Grounding rule: prefer calling a tool to look up real ${companyName} data whenever the question could plausibly be about ${companyName}'s own records, documentation, or policy. If a tool returns nothing relevant, or the question is general knowledge unrelated to ${companyName}'s own data (e.g. 'what's a good icebreaker for a sales call', 'how do I calculate margin'), answer from your own general knowledge instead — just make clear the answer isn't sourced from company data.`,
    `Never claim something is true about ${companyName}'s data without having called a tool to check it first.`,
    "",
    "Available tools:",
    describeToolsForPrompt(),
    "",
    "To use a read tool, respond with action=\"call_tool\", toolName, and toolArgsJson (a JSON-encoded string of the tool's args). You'll be shown the result and can decide again.",
    "To create a record, respond with action=\"propose_write\", toolName, toolArgsJson, and a proposedSummary (one plain sentence describing what will be created, e.g. \"Create a lead for John Doe interested in Goa\"). You do NOT execute the write yourself — the user will be shown a confirm/cancel card, and you must never claim a record was created until a later tool result confirms it.",
    "When you have enough information (or none is needed), respond with action=\"respond\" and finalAnswer containing your full answer to the user, in plain text (no markdown headers or code fences).",
    "",
    "HR-specific facts you can state without a tool: Casual leave 12 days/year, Sick leave 12 days/year, Earned leave 15 days/year; Emergency leave and Work From Home are uncapped/case-by-case; Loss of Pay covers unpaid leave beyond other balances. Leave requests are approved by the employee's reporting manager, or HR/Admin as a fallback. If an uploaded policy document (via getHrPolicyContext) covers the same topic, its exact wording always wins over these general facts. You cannot perform HR actions yourself (apply leave, check in/out, submit corrections, request assets, file tickets) — tell the employee which button/tab on the My HR page to use instead.",
    "",
    "Be concise, warm, and specific. Respond in plain text only.",
    `Respond to the user ONLY in ${LANGUAGE_NAMES[language]}, regardless of what language any tool result or documentation is written in — translate/rephrase the relevant content into ${LANGUAGE_NAMES[language]} yourself. (toolArgsJson and toolName values are never translated, only your finalAnswer/proposedSummary text.)`,
  ].join("\n");
}

function buildLoopPrompt(question: string, transcript: string[]): string {
  if (transcript.length === 0) return question;
  return [
    `The user's question: ${question}`,
    "",
    "So far this turn:",
    ...transcript,
    "",
    "Decide your next action.",
  ].join("\n");
}

export async function runAssistantTurn(input: {
  question: string;
  history: ChatTurn[];
  createdBy: string;
  callerRole: string | null;
  language?: "en" | "ml";
}): Promise<AssistantTurnResult> {
  const language = input.language ?? "en";
  const company = await getCompanySettingsServer();
  const system = buildSystemPrompt(language, company.businessName);
  const transcript: string[] = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const prompt = buildLoopPrompt(input.question, transcript);

    let decision;
    try {
      decision = await generateStructured({
        feature: FEATURE,
        system,
        prompt,
        history: input.history,
        createdBy: input.createdBy,
        schema: assistantDecisionSchema,
        responseSchema: assistantDecisionResponseSchema,
      });
    } catch (err) {
      if (err instanceof AiGenerationError) throw err;
      transcript.push(`(Your last response couldn't be parsed — respond again using the required action/toolName/toolArgsJson/finalAnswer shape.)`);
      continue;
    }

    if (decision.action === "respond") {
      return { kind: "answer", text: decision.finalAnswer?.trim() || "I don't have an answer for that." };
    }

    if (decision.action === "call_tool") {
      const tool = decision.toolName ? getTool(decision.toolName) : undefined;
      if (!tool || tool.kind !== "read") {
        transcript.push(`Tool "${decision.toolName ?? ""}" is not a valid read tool. Available tools are listed above.`);
        continue;
      }
      let args: unknown = {};
      try {
        args = decision.toolArgsJson ? JSON.parse(decision.toolArgsJson) : {};
      } catch {
        transcript.push(`Your toolArgsJson for "${tool.name}" wasn't valid JSON. Try again.`);
        continue;
      }
      const parsed = tool.argsSchema.safeParse(args);
      if (!parsed.success) {
        transcript.push(`Your args for "${tool.name}" were invalid: ${parsed.error.message}`);
        continue;
      }
      let result: unknown;
      try {
        result = await tool.run!(parsed.data);
      } catch (err) {
        transcript.push(`Tool "${tool.name}" failed: ${err instanceof Error ? err.message : "unknown error"}`);
        continue;
      }
      transcript.push(`Tool "${tool.name}" called with ${JSON.stringify(parsed.data)} → result: ${JSON.stringify(result).slice(0, 3000)}`);
      continue;
    }

    if (decision.action === "propose_write") {
      const tool = decision.toolName ? getTool(decision.toolName) : undefined;
      if (!tool || tool.kind !== "write") {
        transcript.push(`Tool "${decision.toolName ?? ""}" is not a valid write tool. Available tools are listed above.`);
        continue;
      }
      let args: unknown = {};
      try {
        args = decision.toolArgsJson ? JSON.parse(decision.toolArgsJson) : {};
      } catch {
        transcript.push(`Your toolArgsJson for "${tool.name}" wasn't valid JSON. Try again.`);
        continue;
      }
      const parsed = tool.argsSchema.safeParse(args);
      if (!parsed.success) {
        transcript.push(`Your args for "${tool.name}" were invalid: ${parsed.error.message}. Fix them and propose again, or ask the user for the missing details.`);
        continue;
      }
      if (tool.allowedRoles && (!input.callerRole || !tool.allowedRoles.includes(input.callerRole))) {
        return { kind: "answer", text: `You don't have permission to create a ${tool.name.replace(/^create/, "").toLowerCase()}. That action needs one of these roles: ${tool.allowedRoles.join(", ")}.` };
      }
      return {
        kind: "proposal",
        tool: tool.name,
        args: parsed.data,
        summary: decision.proposedSummary?.trim() || `Create a new ${tool.name.replace(/^create/, "").toLowerCase()}.`,
      };
    }
  }

  // Loop cap exceeded — fall back to one plain-text answer rather than
  // hanging or surfacing an error for what's likely just an ambiguous
  // question that didn't resolve to a clean tool/answer path.
  const { text } = await generateText({
    feature: `${FEATURE}-fallback`,
    system: `You are the ${company.businessName} Assistant for ${company.businessName}'s ERP. Answer as best you can in plain text, concisely, ONLY in ${LANGUAGE_NAMES[language]}.`,
    prompt: input.question,
    history: input.history,
    createdBy: input.createdBy,
  });
  return { kind: "answer", text };
}
