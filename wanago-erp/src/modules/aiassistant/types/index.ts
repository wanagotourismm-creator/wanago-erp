export type AIProposal = {
  tool: string;
  args: unknown;
  summary: string;
  status: "pending" | "confirmed" | "cancelled" | "error";
  resultDocId?: string;
  errorMessage?: string;
};

export type AIChatMessage = {
  id: string;
  role: "user" | "assistant";
  content?: string;
  proposal?: AIProposal;
};
