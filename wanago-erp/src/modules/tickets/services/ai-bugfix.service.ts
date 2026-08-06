// AI auto-fix pipeline: diagnose a "Software" category ticket against real
// repo source and, if (and only if) the AI is confident, PROPOSE a
// single-file fix. Nothing is ever committed or pushed to GitHub at
// diagnosis time — diagnoseFix() only writes the proposal to the ticket doc
// and waits for a human to review it in-app. A branch/commit/draft PR only
// gets created once an admin explicitly approves via applyApprovedFix()
// (POST /api/tickets/[id]/ai-review-fix), and even then it's a draft that
// still requires a human to merge on GitHub — this pipeline never merges
// anything itself. diagnoseFix() is triggered right after a matching ticket
// is created (src/app/api/tickets/[id]/ai-diagnose/route.ts).
//
// Deliberately TypeScript/Node, NOT part of the Python AI Employee brain —
// GitHub write access (via src/lib/github/github-client.ts) is a distinct,
// higher-blast-radius capability than proposing an ERP data write, so it's
// kept in its own service with its own credential. The Python brain never
// holds a GitHub token.
//
// Safety rails enforced HERE IN CODE, not just prompted:
//   - Single-file patches only (see github-client.ts).
//   - Hard path denylist + file-extension allowlist — checked below, at
//     BOTH diagnosis time and again at approval time (defense in depth).
//   - The AI can only ever "fix" a file it was actually shown, never a
//     path it invents.
//   - Nothing reaches GitHub without an explicit human approval click.
//   - Daily PR cap (countTodaysAiPrs / DAILY_AI_PR_CAP), enforced at the
//     point a PR would actually be opened (approval time), not diagnosis.
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { generateStructured, generateMultimodal, type GenerateImagePart } from "@/modules/ai-core/services/geminiService";
import {
  getGithubContext, fetchRepoTree, fetchFileContent, createBranch, commitFile, openDraftPullRequest,
  type RepoTreeEntry,
} from "@/lib/github/github-client";
import type { Ticket, TicketAttachment } from "@/modules/tickets/types";
import { z } from "zod";

export type DiagnoseResult =
  | { status: "pending_review"; targetFile: string; explanation: string }
  | { status: "needs_human"; reason: string }
  | { status: "skipped"; reason: string };

export type ReviewResult =
  | { status: "pr_opened"; prUrl: string }
  | { status: "needs_human"; reason: string }
  | { status: "skipped"; reason: string };

export const DAILY_AI_PR_CAP = 5;

const ALLOWED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py"];
const MAX_CANDIDATE_FILES = 5;
const MAX_FILE_CHARS = 6_000;
const MAX_TOTAL_CONTEXT_CHARS = 20_000;
const MAX_ANALYZED_IMAGES = 8;

// Never touchable by this pipeline, regardless of how confident the AI
// claims to be — auth, secrets, security rules, its own guardrail code, CI,
// and dependency manifests. Checked against the AI's proposed targetFile
// AFTER generation, not just described in the prompt, since a prompt is
// advisory and this list is not.
const DENYLISTED_PATH_PATTERNS: RegExp[] = [
  /^firestore\.rules$/,
  /^\.env/,
  /^src\/lib\/firebase\/admin\.ts$/,
  /^src\/app\/api\/admin\//,
  /^package(-lock)?\.json$/,
  /^requirements\.txt$/,
  /^vercel\.json$/,
  /^api\/ai\//,
  /ai-tools\.ts$/,
  /ai-assistant.*\.ts$/,
  /^\.github\//,
  /github-client\.ts$/,
  /ai-bugfix\.service\.ts$/,
];

function isDenylisted(path: string): boolean {
  return DENYLISTED_PATH_PATTERNS.some((re) => re.test(path));
}

function hasAllowedExtension(path: string): boolean {
  return ALLOWED_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function shortlistCandidateFiles(tree: RepoTreeEntry[], text: string): string[] {
  const tokens = tokenize(text).filter((t) => t.length > 2);
  return tree
    .filter((e) => e.type === "blob" && hasAllowedExtension(e.path) && !isDenylisted(e.path))
    .map((e) => {
      const pathTokens = new Set(tokenize(e.path));
      let score = 0;
      for (const t of tokens) if (pathTokens.has(t)) score += 1;
      return { path: e.path, score };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATE_FILES)
    .map((e) => e.path);
}

async function searchResolvedKnowledge(text: string): Promise<{ title: string; content: string }[]> {
  const db = getAdminDb();
  if (!db) return [];
  const tokens = new Set(tokenize(text));
  const snap = await db.collection(FIRESTORE_COLLECTIONS.RESOLVED_TICKET_KNOWLEDGE).get();
  return snap.docs
    .map((d) => {
      const data = d.data();
      const titleTokens = new Set(tokenize(String(data.title ?? "")));
      const contentTokens = new Set(tokenize(String(data.content ?? "")));
      let score = 0;
      for (const t of tokens) {
        if (titleTokens.has(t)) score += 3;
        if (contentTokens.has(t)) score += 1;
      }
      return { score, title: data.title as string, content: data.content as string };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ title, content }) => ({ title, content }));
}

async function fetchAsImagePart(url: string): Promise<GenerateImagePart | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mimeType = res.headers.get("content-type") ?? "image/jpeg";
    return { mimeType, base64Data: buf.toString("base64") };
  } catch {
    return null;
  }
}

const ATTACHMENT_ANALYSIS_SYSTEM_PROMPT = [
  "You are helping diagnose a software bug ticket from a reporter's attached screenshots.",
  "Some images may be frames sampled in order from a screen recording rather than standalone screenshots.",
  "Describe factually: any visible error messages or stack traces (quote them exactly as shown), which screen/page/component " +
    "is on screen, and what UI state or user action appears to trigger the problem.",
  "Do not guess at the underlying code cause — just describe what is visibly happening.",
].join(" ");

// Turns a ticket's attached screenshots/video-frames into a short text
// description via Gemini vision, so buildDiagnosisPrompt can feed it to the
// (text-only) diagnosis model alongside the source files. Returns null if
// there's nothing to analyze or the vision call fails — attachments are
// evidence, not a requirement, so this never blocks diagnosis.
async function describeAttachments(attachments: TicketAttachment[]): Promise<string | null> {
  const imageAttachments = attachments
    .filter((a) => a.type === "image" || a.type === "video-frame")
    .slice(0, MAX_ANALYZED_IMAGES);
  if (imageAttachments.length === 0) return null;

  const images = (await Promise.all(imageAttachments.map((a) => fetchAsImagePart(a.url))))
    .filter((img): img is GenerateImagePart => img !== null);
  if (images.length === 0) return null;

  try {
    const text = await generateMultimodal({
      feature: "ai-bugfix-attachment-analysis",
      system: ATTACHMENT_ANALYSIS_SYSTEM_PROMPT,
      prompt: "Describe what these images show, focused on anything relevant to diagnosing a software bug.",
      images,
      createdBy: "system",
    });
    return text.trim() || null;
  } catch {
    return null;
  }
}

const bugfixDecisionSchema = z.object({
  confident: z.boolean(),
  reason: z.string().optional(),
  targetFile: z.string().optional(),
  explanation: z.string().optional(),
  newFileContent: z.string().optional(),
});

const bugfixDecisionResponseSchema = {
  type: "OBJECT",
  properties: {
    confident: { type: "BOOLEAN" },
    reason: { type: "STRING" },
    targetFile: { type: "STRING" },
    explanation: { type: "STRING" },
    newFileContent: { type: "STRING" },
  },
  required: ["confident"],
};

const SYSTEM_PROMPT = [
  "You are a careful software engineer diagnosing a bug report against real source code.",
  "You will be shown a ticket description, possibly a description of attached screenshots/screen-recording frames, and " +
    "the full contents of a few files that might be related.",
  "If you are NOT highly confident you've found the actual cause and a correct, minimal, single-file fix, respond " +
    "with confident=false and a one-sentence reason — this is the expected, safe outcome for anything ambiguous, " +
    "multi-file, or outside the files shown to you.",
  "Only respond with confident=true if you can point at the exact file (from the ones shown) and write its " +
    "complete corrected content.",
  "newFileContent must be the ENTIRE file with your fix applied, not a diff or a snippet — it will be committed verbatim.",
  "Never propose changing configuration, environment, security-rule, or dependency-lockfile files even if they " +
    "seem related — say confident=false instead and explain why a human should look.",
  "Be conservative: a wrong 'confident' fix pushed to a live production system is far worse than correctly " +
    "saying you're not sure.",
].join(" ");

function buildDiagnosisPrompt(
  ticket: Ticket, knowledge: { title: string; content: string }[], files: { path: string; content: string }[],
  attachmentDescription: string | null
): string {
  const parts = [`Ticket: ${ticket.title}`, `Description: ${ticket.description}`, ""];
  if (attachmentDescription) {
    parts.push("What the reporter's attached screenshot(s)/screen recording show:", attachmentDescription, "");
  }
  if (knowledge.length > 0) {
    parts.push("Similar past resolutions on file:");
    for (const k of knowledge) parts.push(`- ${k.title}: ${k.content}`);
    parts.push("");
  }
  parts.push("Candidate files (only these may be the target of a fix):");
  for (const f of files) {
    parts.push(`--- ${f.path} ---`);
    parts.push(f.content.slice(0, MAX_FILE_CHARS));
    parts.push("");
  }
  return parts.join("\n");
}

function buildPrBody(ticket: Ticket, explanation: string, targetFile: string): string {
  return [
    "⚠️ **AI-generated draft fix — requires human review before merge.**",
    "Do not merge without verifying against the original issue and running tests.",
    "",
    `**Source ticket:** ${ticket.refNumber} — ${ticket.title}`,
    `**File changed:** \`${targetFile}\``,
    "",
    "**AI's explanation:**",
    explanation || "(no explanation given)",
  ].join("\n");
}

async function updateTicketAiFields(ticketId: string, patch: Record<string, unknown>): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection(FIRESTORE_COLLECTIONS.TICKETS).doc(ticketId).set(patch, { merge: true });
}

export async function countTodaysAiPrs(): Promise<number> {
  const db = getAdminDb();
  if (!db) return 0;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const snap = await db.collection(FIRESTORE_COLLECTIONS.TICKETS).where("aiDiagnosedAt", ">=", startOfDay).get();
  return snap.docs.filter((d) => !!d.data().aiPrUrl).length;
}

// Diagnosis only — never touches GitHub. Populates aiProposedFix +
// aiFixReviewStatus="pending_review" on the ticket when confident, for a
// human to approve via applyApprovedFix(); otherwise records the reason a
// human needs to triage it manually.
export async function diagnoseFix(ticket: Ticket): Promise<DiagnoseResult> {
  const ctx = await getGithubContext();
  if (!ctx) return { status: "skipped", reason: "GitHub integration isn't configured (Admin > Integrations)." };

  const searchText = `${ticket.title} ${ticket.description}`;
  const [knowledge, attachmentDescription] = await Promise.all([
    searchResolvedKnowledge(searchText),
    describeAttachments(ticket.attachments ?? []),
  ]);

  const tree = await fetchRepoTree(ctx);
  const candidatePaths = shortlistCandidateFiles(tree, searchText);
  if (candidatePaths.length === 0) {
    const reason = "Couldn't find any source files that look related to this description.";
    await updateTicketAiFields(ticket.id, { aiDiagnosis: reason, aiFixReviewStatus: null, aiProposedFix: null, aiDiagnosedAt: new Date() });
    return { status: "needs_human", reason };
  }

  const files: { path: string; content: string }[] = [];
  let totalChars = 0;
  for (const path of candidatePaths) {
    const content = await fetchFileContent(ctx, path);
    if (!content || totalChars + content.length > MAX_TOTAL_CONTEXT_CHARS) continue;
    files.push({ path, content });
    totalChars += content.length;
  }
  if (files.length === 0) {
    const reason = "Found possibly-related files but couldn't read their contents.";
    await updateTicketAiFields(ticket.id, { aiDiagnosis: reason, aiFixReviewStatus: null, aiProposedFix: null, aiDiagnosedAt: new Date() });
    return { status: "needs_human", reason };
  }

  const decision = await generateStructured({
    feature: "ai-bugfix-diagnosis",
    system: SYSTEM_PROMPT,
    prompt: buildDiagnosisPrompt(ticket, knowledge, files, attachmentDescription),
    createdBy: "system",
    schema: bugfixDecisionSchema,
    responseSchema: bugfixDecisionResponseSchema,
  });

  if (!decision.confident || !decision.targetFile || !decision.newFileContent) {
    const reason = decision.reason?.trim() || "AI couldn't confidently diagnose a fix for this from the available context.";
    await updateTicketAiFields(ticket.id, { aiDiagnosis: reason, aiFixReviewStatus: null, aiProposedFix: null, aiDiagnosedAt: new Date() });
    return { status: "needs_human", reason };
  }

  const targetFile = decision.targetFile.replace(/^\/+/, "");
  const shownFile = files.find((f) => f.path === targetFile);
  if (isDenylisted(targetFile) || !hasAllowedExtension(targetFile) || !shownFile) {
    const reason = `AI proposed changing "${targetFile}", which is outside what this pipeline is allowed to touch — flagging for manual review instead of proceeding.`;
    await updateTicketAiFields(ticket.id, { aiDiagnosis: reason, aiFixReviewStatus: null, aiProposedFix: null, aiDiagnosedAt: new Date() });
    return { status: "needs_human", reason };
  }

  const explanation = decision.explanation ?? "";
  await updateTicketAiFields(ticket.id, {
    aiDiagnosis: explanation,
    aiFixReviewStatus: "pending_review",
    aiProposedFix: { targetFile, oldFileContent: shownFile.content, newFileContent: decision.newFileContent },
    aiDiagnosedAt: new Date(),
  });
  return { status: "pending_review", targetFile, explanation };
}

// The only function in this pipeline that ever writes to GitHub — called
// exclusively from POST /api/tickets/[id]/ai-review-fix after an admin
// clicks Approve. Re-verifies the denylist/extension rules and re-fetches
// the target file to make sure it hasn't drifted since diagnosis (someone
// else may have merged a change to it in the meantime) before committing.
export async function applyApprovedFix(ticketId: string, approvedBy: string): Promise<ReviewResult> {
  const db = getAdminDb();
  if (!db) return { status: "skipped", reason: "Server isn't configured for this yet." };

  const snap = await db.collection(FIRESTORE_COLLECTIONS.TICKETS).doc(ticketId).get();
  if (!snap.exists) return { status: "skipped", reason: "Ticket not found." };
  const ticket = { id: snap.id, ...snap.data() } as Ticket;

  if (ticket.aiFixReviewStatus !== "pending_review" || !ticket.aiProposedFix) {
    return { status: "skipped", reason: "Nothing is pending review on this ticket." };
  }

  const todaysCount = await countTodaysAiPrs();
  if (todaysCount >= DAILY_AI_PR_CAP) {
    return { status: "skipped", reason: `Daily AI auto-fix limit (${DAILY_AI_PR_CAP}) reached — try again tomorrow, or apply this fix manually.` };
  }

  const ctx = await getGithubContext();
  if (!ctx) return { status: "skipped", reason: "GitHub integration isn't configured (Admin > Integrations)." };

  const { targetFile, oldFileContent, newFileContent } = ticket.aiProposedFix;
  if (isDenylisted(targetFile) || !hasAllowedExtension(targetFile)) {
    const reason = `"${targetFile}" is outside what this pipeline is allowed to touch.`;
    await updateTicketAiFields(ticketId, { aiFixReviewStatus: "rejected", aiReviewedAt: new Date(), aiReviewedBy: approvedBy });
    return { status: "needs_human", reason };
  }

  const currentContent = await fetchFileContent(ctx, targetFile);
  if (currentContent !== oldFileContent) {
    const reason = `"${targetFile}" has changed on GitHub since this was diagnosed — re-run diagnosis before approving, to avoid overwriting a newer version.`;
    return { status: "needs_human", reason };
  }

  const branchName = `ai-fix/${ticket.refNumber.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${Date.now()}`;
  await createBranch(ctx, branchName);
  await commitFile(ctx, branchName, targetFile, newFileContent, `AI fix: ${ticket.title} (${ticket.refNumber})`);
  const { url } = await openDraftPullRequest(
    ctx, branchName, `[AI Draft] ${ticket.title} (${ticket.refNumber})`,
    buildPrBody(ticket, ticket.aiDiagnosis ?? "", targetFile)
  );

  await updateTicketAiFields(ticketId, {
    aiFixReviewStatus: "approved", aiPrUrl: url, aiProposedFix: null,
    aiReviewedAt: new Date(), aiReviewedBy: approvedBy,
  });
  return { status: "pr_opened", prUrl: url };
}

// Dismisses a pending proposal without ever contacting GitHub.
export async function rejectFix(ticketId: string, rejectedBy: string): Promise<ReviewResult> {
  const db = getAdminDb();
  if (!db) return { status: "skipped", reason: "Server isn't configured for this yet." };

  const snap = await db.collection(FIRESTORE_COLLECTIONS.TICKETS).doc(ticketId).get();
  if (!snap.exists) return { status: "skipped", reason: "Ticket not found." };
  const ticket = snap.data() as Ticket;
  if (ticket.aiFixReviewStatus !== "pending_review") {
    return { status: "skipped", reason: "Nothing is pending review on this ticket." };
  }

  await updateTicketAiFields(ticketId, {
    aiFixReviewStatus: "rejected", aiProposedFix: null, aiReviewedAt: new Date(), aiReviewedBy: rejectedBy,
  });
  return { status: "skipped", reason: "Rejected by admin — nothing was pushed to GitHub." };
}
