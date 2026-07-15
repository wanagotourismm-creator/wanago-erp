import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/admin";
import { logAiAction } from "@/modules/ai-core/services/ai-action-log.service";

export const runtime = "nodejs";

// Called by the client after it executes (or fails to execute) an
// AI-proposed write via the real createLead/createQuotation service
// functions — see confirmProposedAction in
// src/modules/aiassistant/services/ai-assistant.service.ts. This route
// only records the outcome for audit; it never performs the write itself,
// so it always returns ok regardless of the logging result — a logging
// hiccup must never look like the write itself failed.
export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const caller = await requireAuth(idToken);
  if (!caller) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: {
    tool?: string;
    argsSummary?: string;
    resultCollection?: string | null;
    resultDocId?: string | null;
    outcome?: "success" | "error";
    errorMessage?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (body.tool && body.outcome) {
    await logAiAction({
      tool: String(body.tool).slice(0, 128),
      argsSummary: String(body.argsSummary ?? "").slice(0, 1000),
      createdBy: caller.uid,
      resultCollection: body.resultCollection ?? null,
      resultDocId: body.resultDocId ?? null,
      outcome: body.outcome === "success" ? "success" : "error",
      errorMessage: body.errorMessage ? String(body.errorMessage).slice(0, 500) : null,
    });
  }

  return NextResponse.json({ ok: true });
}
