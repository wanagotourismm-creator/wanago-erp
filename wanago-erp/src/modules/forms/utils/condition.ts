import type { FieldCondition } from "@/modules/forms/types";

// Shared by FormRenderer (decide whether to show a question while someone's
// filling the form) — a field with no condition is always shown.
export function evaluateCondition(
  condition: FieldCondition | null,
  answers: Record<string, string | string[] | number | null | undefined>
): boolean {
  if (!condition) return true;
  const answer = answers[condition.fieldId];
  const answerStr = Array.isArray(answer) ? answer.join(",") : String(answer ?? "");

  switch (condition.operator) {
    case "equals":     return answerStr === condition.value;
    case "not_equals":  return answerStr !== condition.value;
    case "contains":    return answerStr.includes(condition.value);
    default:            return true;
  }
}
