import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAdminDb } from "@/lib/firebase/admin";
import { generateText } from "@/modules/ai-core/services/geminiService";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Called fire-and-forget right after a ticket is resolved with notes (see
// resolveTicketWithNotes in ticket.service.ts) — summarizes the
// problem+fix into resolvedTicketKnowledge so both the chat assistant
// (searchResolvedIssues, api/ai/_lib/tools.py) and the auto-fix diagnosis
// pipeline can find it later. Always returns {ok:true}: a failed
// summarization must never surface as an error to whoever just resolved
// the ticket — same contract as /api/ai-assistant/log-action.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: true });

  try {
    const snap = await db.collection(FIRESTORE_COLLECTIONS.TICKETS).doc(id).get();
    if (!snap.exists) return NextResponse.json({ ok: true });
    const ticket = snap.data()!;
    if (!ticket.resolutionNotes) return NextResponse.json({ ok: true });

    const prompt = [
      `Ticket title: ${ticket.title}`,
      `Description: ${ticket.description}`,
      `How it was resolved: ${ticket.resolutionNotes}`,
      "",
      "Summarize this as a short, searchable knowledge-base entry for future staff hitting the same problem. " +
        "Respond with exactly two lines: a one-line title, then a 2-4 sentence plain-text summary of the problem " +
        "and the fix. No markdown, no headers.",
    ].join("\n");

    const { text } = await generateText({ feature: "ticket-resolution-knowledge", prompt, createdBy: caller.uid });

    const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    const title = (lines[0] || ticket.title).slice(0, 200);
    const content = (lines.slice(1).join(" ") || text).slice(0, 2000);
    const keywords = String(ticket.category ?? "").split(/\s+/).filter(Boolean);

    await db.collection(FIRESTORE_COLLECTIONS.RESOLVED_TICKET_KNOWLEDGE).add({
      title, content, category: ticket.category ?? null, keywords,
      sourceTicketRef: ticket.refNumber ?? null,
      createdAt: new Date(), updatedAt: new Date(),
    });
  } catch {
    // best-effort, see doc comment above
  }

  return NextResponse.json({ ok: true });
}
