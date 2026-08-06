// AI code-change pipeline: diagnose a "Software" (bug) or "Feature Request"
// category ticket against real repo source and, if (and only if) the AI is
// confident, PROPOSE a change spanning up to MAX_FILES_PER_FIX files.
// Nothing is ever committed or pushed to GitHub at diagnosis time —
// diagnoseFix() only writes the proposal to the ticket doc and waits for a
// human to review it in-app. A branch/commit/draft PR only gets created
// once an admin explicitly approves via applyApprovedFix() (POST
// /api/tickets/[id]/ai-review-fix), and even then it's a draft that still
// requires a human to merge on GitHub — this pipeline never merges
// anything itself. diagnoseFix() is triggered right after a matching
// ticket is created (src/app/api/tickets/[id]/ai-diagnose/route.ts).
//
// Deliberately TypeScript/Node, NOT part of the Python AI Employee brain —
// GitHub write access (via src/lib/github/github-client.ts) is a distinct,
// higher-blast-radius capability than proposing an ERP data write, so it's
// kept in its own service with its own credential. The Python brain never
// holds a GitHub token.
//
// Safety rails enforced HERE IN CODE, not just prompted:
//   - At most MAX_FILES_PER_FIX files per proposal (see github-client.ts —
//     each still committed one at a time via the single-file Contents API).
//   - Hard path denylist + file-extension allowlist — checked below, at
//     BOTH diagnosis time and again at approval time (defense in depth).
//   - A file the AI wasn't shown is only acceptable if it's verified (by
//     actually asking GitHub, never by trusting the AI's own claim) to not
//     already exist — it can create new files, never blind-overwrite one
//     it never saw.
//   - Any new/changed file under src/app/api/ must contain a recognizable
//     auth check, or it's rejected — closes off the AI silently shipping
//     an unauthenticated route.
//   - Any file using a raw Firestore collection-name string (instead of
//     the existing FIRESTORE_COLLECTIONS constants) is rejected — this
//     pipeline is not allowed to introduce a new collection, since that
//     always needs a firestore.rules entry it's separately denylisted from
//     touching (see the resolvedTicketKnowledge incident this project's
//     already been bitten by once — a collection with no dedicated rule
//     falls through to a fairly permissive catch-all).
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
  | { status: "pending_review"; targetFiles: string[]; explanation: string }
  | { status: "needs_human"; reason: string }
  | { status: "skipped"; reason: string };

export type ReviewResult =
  | { status: "pr_opened"; prUrl: string }
  | { status: "needs_human"; reason: string }
  | { status: "skipped"; reason: string };

export const DAILY_AI_PR_CAP = 5;
export const MAX_FILES_PER_FIX = 4;

const ALLOWED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py"];
const MAX_CANDIDATE_FILES = 8;
const MAX_FILE_CHARS = 8_000;
const MAX_TOTAL_CONTEXT_CHARS = 30_000;
const MAX_ANALYZED_IMAGES = 8;
// Full file contents (potentially several, for a feature build) need far
// more headroom than this app's default chat-assistant output budget
// (500 tokens, tuned for short replies) — without this override, anything
// but a trivially small file would come back truncated and fail schema
// validation.
const DIAGNOSIS_MAX_OUTPUT_TOKENS = 8000;

// Never touchable by this pipeline, regardless of how confident the AI
// claims to be — auth, secrets, security rules, its own guardrail code, CI,
// dependency manifests, and the Firestore collection-name registry (see the
// raw-collection-string check below for why that last one matters).
// Checked against every proposed target file AFTER generation, not just
// described in the prompt, since a prompt is advisory and this list isn't.
const DENYLISTED_PATH_PATTERNS: RegExp[] = [
  /^firestore\.rules$/,
  /^\.env/,
  /^src\/lib\/firebase\/admin\.ts$/,
  /^src\/lib\/constants\.ts$/,
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

// Matches any of this codebase's existing server-side auth-check helpers
// (src/lib/firebase/admin.ts) — a new/changed API route must call one of
// these, or it's flagged rather than risk shipping an unauthenticated
// endpoint. Deliberately a plain substring-ish regex, not real parsing:
// good enough to catch "there's no auth check at all," which is the actual
// failure mode worth blocking, without trying to verify it's used correctly.
const AUTH_CHECK_PATTERN = /require(Auth|Admin|SuperAdmin|HrOrAdmin|AdminOrFinance|OperationsOrSales|PortalAuth)\s*\(/;
// A raw string literal handed to .collection(...) instead of a
// FIRESTORE_COLLECTIONS.* constant — the tell that code is reaching for a
// collection outside the registry this pipeline is barred from extending.
const RAW_COLLECTION_STRING_PATTERN = /\.collection\(\s*["'`]/;

function isDenylisted(path: string): boolean {
  return DENYLISTED_PATH_PATTERNS.some((re) => re.test(path));
}

function hasAllowedExtension(path: string): boolean {
  return ALLOWED_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function isApiRoutePath(path: string): boolean {
  return /^src\/app\/api\//.test(path);
}

// Path-only checks — cheap, and don't need the file's proposed content.
function validateFileTarget(path: string): string | null {
  if (isDenylisted(path)) return `"${path}" is outside what this pipeline is allowed to touch.`;
  if (!hasAllowedExtension(path)) return `"${path}" has a file type this pipeline isn't allowed to touch.`;
  return null;
}

// Content-dependent checks — can only run once the AI has actually written
// the file.
function violatesContentSafetyRules(path: string, content: string): string | null {
  if (isApiRoutePath(path) && !AUTH_CHECK_PATTERN.test(content)) {
    return `"${path}" is a new/changed API route with no recognizable auth check (requireAuth/requireAdmin/etc.) — flagging for manual review rather than risk an unauthenticated endpoint.`;
  }
  if (RAW_COLLECTION_STRING_PATTERN.test(content)) {
    return `"${path}" accesses Firestore via a raw collection-name string instead of FIRESTORE_COLLECTIONS — flagging for manual review, since introducing a genuinely new collection needs a firestore.rules entry this pipeline can't add.`;
  }
  return null;
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
  "You are helping diagnose a software ticket from a reporter's attached screenshots.",
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
      prompt: "Describe what these images show, focused on anything relevant to diagnosing a software issue.",
      images,
      createdBy: "system",
    });
    return text.trim() || null;
  } catch {
    return null;
  }
}

const proposedFileSchema = z.object({
  targetFile: z.string(),
  newFileContent: z.string(),
});

const bugfixDecisionSchema = z.object({
  confident: z.boolean(),
  reason: z.string().optional(),
  summary: z.string().optional(),
  files: z.array(proposedFileSchema).optional(),
});

const bugfixDecisionResponseSchema = {
  type: "OBJECT",
  properties: {
    confident: { type: "BOOLEAN" },
    reason: { type: "STRING" },
    summary: { type: "STRING" },
    files: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          targetFile: { type: "STRING" },
          newFileContent: { type: "STRING" },
        },
        required: ["targetFile", "newFileContent"],
      },
    },
  },
  required: ["confident"],
};

type DiagnosisMode = "bugfix" | "feature";

function buildSystemPrompt(mode: DiagnosisMode): string {
  const shared = [
    "You will be shown a ticket description, possibly a description of attached screenshots/screen-recording frames, " +
      "and the full contents of a few files from the real codebase.",
    "If you are NOT highly confident, respond with confident=false and a one-sentence reason — this is the expected, " +
      "safe outcome for anything ambiguous or outside what you were shown.",
    `You may change or create at most ${MAX_FILES_PER_FIX} files. Only respond with confident=true if you can name ` +
      "every file you're touching and write each one's COMPLETE new content — never a diff or snippet, it will be " +
      "committed verbatim.",
    "You may create a genuinely new file if the task needs one, but never overwrite a file you weren't shown unless " +
      "you are certain it doesn't already exist.",
    "Never propose changing configuration, environment, security-rule, dependency-lockfile, or Firestore-collection-" +
      "constant files even if they seem related — say confident=false instead and explain why a human should look.",
    "Any new or changed file under src/app/api/ must include a real auth check using one of this codebase's existing " +
      "helpers (requireAuth/requireAdmin/requireSuperAdmin/requireHrOrAdmin/requireAdminOrFinance/" +
      "requireOperationsOrSales) — never an unauthenticated route.",
    "Always access Firestore through the existing FIRESTORE_COLLECTIONS constants, never a raw collection-name " +
      "string. If the task seems to need a brand new collection, that's out of scope — say confident=false and " +
      "explain that a human needs to add it with a security rule first.",
    "Be conservative: a wrong 'confident' change pushed to a live production system is far worse than correctly " +
      "saying you're not sure.",
  ];
  if (mode === "bugfix") {
    return [
      "You are a careful software engineer diagnosing a bug report against real source code.",
      "Prefer the smallest possible fix — usually a single file.",
      ...shared,
    ].join(" ");
  }
  return [
    "You are a careful software engineer implementing a small, well-scoped feature request against a real, existing " +
      "production codebase.",
    "Follow the existing patterns visible in the files you're shown — naming, component structure, how " +
      "services/hooks/routes are organized — rather than inventing new conventions.",
    "Only attempt this if the request is genuinely small (a new field on an existing form, a small new component, a " +
      "new read-only view of existing data, extending an existing list/table). Anything that sounds like it needs " +
      "new infrastructure, a new Firestore collection, or touches money/payments/security should be confident=false.",
    ...shared,
  ].join(" ");
}

function buildDiagnosisPrompt(
  ticket: Ticket, knowledge: { title: string; content: string }[], files: { path: string; content: string }[],
  attachmentDescription: string | null, mode: DiagnosisMode
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
  parts.push(
    mode === "feature"
      ? "Files from the codebase that look related — use these to follow existing naming/structure conventions, and as candidates to edit or extend:"
      : "Candidate files that might be the cause — the fix should normally target one of these:"
  );
  for (const f of files) {
    parts.push(`--- ${f.path} ---`);
    parts.push(f.content.slice(0, MAX_FILE_CHARS));
    parts.push("");
  }
  return parts.join("\n");
}

function buildPrBody(ticket: Ticket, summary: string, targetFiles: string[]): string {
  return [
    "⚠️ **AI-generated draft change — requires human review before merge.**",
    "Do not merge without verifying against the original ticket and running tests.",
    "",
    `**Source ticket:** ${ticket.refNumber} — ${ticket.title}`,
    `**Files changed:** ${targetFiles.map((f) => `\`${f}\``).join(", ")}`,
    "",
    "**AI's summary:**",
    summary || "(no summary given)",
  ].join("\n");
}

async function updateTicketAiFields(ticketId: string, patch: Record<string, unknown>): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection(FIRESTORE_COLLECTIONS.TICKETS).doc(ticketId).set(patch, { merge: true });
}

async function declineDiagnosis(ticketId: string, reason: string): Promise<DiagnoseResult> {
  await updateTicketAiFields(ticketId, { aiDiagnosis: reason, aiFixReviewStatus: null, aiProposedFix: null, aiDiagnosedAt: new Date() });
  return { status: "needs_human", reason };
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

  const mode: DiagnosisMode = ticket.category === "Feature Request" ? "feature" : "bugfix";
  const searchText = `${ticket.title} ${ticket.description}`;
  const [knowledge, attachmentDescription] = await Promise.all([
    searchResolvedKnowledge(searchText),
    describeAttachments(ticket.attachments ?? []),
  ]);

  const tree = await fetchRepoTree(ctx);
  const candidatePaths = shortlistCandidateFiles(tree, searchText);
  if (candidatePaths.length === 0) {
    return declineDiagnosis(ticket.id, "Couldn't find any source files that look related to this description.");
  }

  const shownFiles: { path: string; content: string }[] = [];
  let totalChars = 0;
  for (const path of candidatePaths) {
    const content = await fetchFileContent(ctx, path);
    if (!content || totalChars + content.length > MAX_TOTAL_CONTEXT_CHARS) continue;
    shownFiles.push({ path, content });
    totalChars += content.length;
  }
  if (shownFiles.length === 0) {
    return declineDiagnosis(ticket.id, "Found possibly-related files but couldn't read their contents.");
  }

  const decision = await generateStructured({
    feature: mode === "feature" ? "ai-feature-build-diagnosis" : "ai-bugfix-diagnosis",
    system: buildSystemPrompt(mode),
    prompt: buildDiagnosisPrompt(ticket, knowledge, shownFiles, attachmentDescription, mode),
    createdBy: "system",
    schema: bugfixDecisionSchema,
    responseSchema: bugfixDecisionResponseSchema,
    maxOutputTokens: DIAGNOSIS_MAX_OUTPUT_TOKENS,
  });

  if (!decision.confident || !decision.files || decision.files.length === 0) {
    return declineDiagnosis(ticket.id, decision.reason?.trim() || "AI couldn't confidently make this change from the available context.");
  }
  if (decision.files.length > MAX_FILES_PER_FIX) {
    return declineDiagnosis(
      ticket.id,
      `AI's proposal touches ${decision.files.length} files, more than this pipeline allows (${MAX_FILES_PER_FIX}) — flagging for manual review.`
    );
  }

  const resolvedFiles: { targetFile: string; isNewFile: boolean; oldFileContent: string; newFileContent: string }[] = [];
  for (const f of decision.files) {
    const targetFile = f.targetFile.replace(/^\/+/, "");

    const targetError = validateFileTarget(targetFile);
    if (targetError) return declineDiagnosis(ticket.id, `${targetError} — flagging for manual review instead of proceeding.`);

    const contentError = violatesContentSafetyRules(targetFile, f.newFileContent);
    if (contentError) return declineDiagnosis(ticket.id, contentError);

    const shownFile = shownFiles.find((sf) => sf.path === targetFile);
    if (shownFile) {
      resolvedFiles.push({ targetFile, isNewFile: false, oldFileContent: shownFile.content, newFileContent: f.newFileContent });
      continue;
    }

    // Wasn't one of the files shown to the model — only acceptable as a
    // genuinely new file. Verify against the real repo rather than trust
    // the AI's own claim, so it can never silently overwrite something it
    // never saw.
    const existing = await fetchFileContent(ctx, targetFile);
    if (existing !== null) {
      return declineDiagnosis(
        ticket.id,
        `AI proposed changing "${targetFile}", a file it wasn't shown — flagging for manual review instead of risking an unreviewed overwrite.`
      );
    }
    resolvedFiles.push({ targetFile, isNewFile: true, oldFileContent: "", newFileContent: f.newFileContent });
  }

  const summary = decision.summary?.trim() || decision.reason?.trim() || "";
  await updateTicketAiFields(ticket.id, {
    aiDiagnosis: summary,
    aiFixReviewStatus: "pending_review",
    aiProposedFix: { summary, files: resolvedFiles },
    aiDiagnosedAt: new Date(),
  });
  return { status: "pending_review", targetFiles: resolvedFiles.map((f) => f.targetFile), explanation: summary };
}

// The only function in this pipeline that ever writes to GitHub — called
// exclusively from POST /api/tickets/[id]/ai-review-fix after an admin
// clicks Approve. Re-verifies every safety rule and re-fetches each target
// file to make sure it hasn't drifted since diagnosis (for an existing
// file, someone else may have changed it; for a new file, someone may have
// created something at that path in the meantime) before committing anything.
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

  const { files } = ticket.aiProposedFix;
  for (const f of files) {
    const targetError = validateFileTarget(f.targetFile);
    if (targetError) {
      await updateTicketAiFields(ticketId, { aiFixReviewStatus: "rejected", aiReviewedAt: new Date(), aiReviewedBy: approvedBy });
      return { status: "needs_human", reason: targetError };
    }
    const contentError = violatesContentSafetyRules(f.targetFile, f.newFileContent);
    if (contentError) {
      await updateTicketAiFields(ticketId, { aiFixReviewStatus: "rejected", aiReviewedAt: new Date(), aiReviewedBy: approvedBy });
      return { status: "needs_human", reason: contentError };
    }

    const currentContent = await fetchFileContent(ctx, f.targetFile);
    if (f.isNewFile) {
      if (currentContent !== null) {
        return { status: "needs_human", reason: `"${f.targetFile}" now exists on GitHub (it didn't when this was diagnosed) — re-run diagnosis before approving, to avoid overwriting it.` };
      }
    } else if (currentContent !== f.oldFileContent) {
      return { status: "needs_human", reason: `"${f.targetFile}" has changed on GitHub since this was diagnosed — re-run diagnosis before approving, to avoid overwriting a newer version.` };
    }
  }

  const branchName = `ai-fix/${ticket.refNumber.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${Date.now()}`;
  await createBranch(ctx, branchName);
  for (const f of files) {
    await commitFile(ctx, branchName, f.targetFile, f.newFileContent, `AI: ${ticket.title} (${ticket.refNumber}) — ${f.targetFile}`);
  }
  const { url } = await openDraftPullRequest(
    ctx, branchName, `[AI Draft] ${ticket.title} (${ticket.refNumber})`,
    buildPrBody(ticket, ticket.aiProposedFix.summary, files.map((f) => f.targetFile))
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
