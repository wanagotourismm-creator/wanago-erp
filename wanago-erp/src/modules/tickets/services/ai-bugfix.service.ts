// AI auto-fix pipeline: diagnose a "Software" category ticket against real
// repo source and, if (and only if) the AI is confident, open a DRAFT pull
// request for a human to review — never merges anything itself. Triggered
// by POST /api/tickets/[id]/ai-diagnose right after a matching ticket is
// created (src/app/api/tickets/[id]/ai-diagnose/route.ts).
//
// Deliberately TypeScript/Node, NOT part of the Python AI Employee brain —
// GitHub write access (via src/lib/github/github-client.ts) is a distinct,
// higher-blast-radius capability than proposing an ERP data write, so it's
// kept in its own service with its own credential. The Python brain never
// holds a GitHub token.
//
// Safety rails enforced HERE IN CODE, not just prompted:
//   - Single-file patches only (see github-client.ts).
//   - Hard path denylist + file-extension allowlist — checked below.
//   - The AI can only ever "fix" a file it was actually shown, never a
//     path it invents.
//   - Daily PR cap (countTodaysAiPrs / DAILY_AI_PR_CAP) checked by the
//     calling route before this even runs.
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { generateStructured } from "@/modules/ai-core/services/geminiService";
import {
  getGithubContext, fetchRepoTree, fetchFileContent, createBranch, commitFile, openDraftPullRequest,
  type RepoTreeEntry,
} from "@/lib/github/github-client";
import type { Ticket } from "@/modules/tickets/types";
import { z } from "zod";

export type BugfixResult =
  | { status: "pr_opened"; prUrl: string; explanation: string }
  | { status: "needs_human"; reason: string }
  | { status: "skipped"; reason: string };

export const DAILY_AI_PR_CAP = 5;

const ALLOWED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py"];
const MAX_CANDIDATE_FILES = 5;
const MAX_FILE_CHARS = 6_000;
const MAX_TOTAL_CONTEXT_CHARS = 20_000;

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
  "You will be shown a ticket description and the full contents of a few files that might be related.",
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
  ticket: Ticket, knowledge: { title: string; content: string }[], files: { path: string; content: string }[]
): string {
  const parts = [`Ticket: ${ticket.title}`, `Description: ${ticket.description}`, ""];
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

async function recordDiagnosisResult(ticketId: string, aiDiagnosis: string | null, aiPrUrl: string | null): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection(FIRESTORE_COLLECTIONS.TICKETS).doc(ticketId).set(
    { aiDiagnosis, aiPrUrl, aiDiagnosedAt: new Date() },
    { merge: true }
  );
}

export async function countTodaysAiPrs(): Promise<number> {
  const db = getAdminDb();
  if (!db) return 0;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const snap = await db.collection(FIRESTORE_COLLECTIONS.TICKETS).where("aiDiagnosedAt", ">=", startOfDay).get();
  return snap.docs.filter((d) => !!d.data().aiPrUrl).length;
}

export async function diagnoseAndDraftFix(ticket: Ticket): Promise<BugfixResult> {
  const ctx = await getGithubContext();
  if (!ctx) return { status: "skipped", reason: "GitHub integration isn't configured (Admin > Integrations)." };

  const searchText = `${ticket.title} ${ticket.description}`;
  const knowledge = await searchResolvedKnowledge(searchText);

  const tree = await fetchRepoTree(ctx);
  const candidatePaths = shortlistCandidateFiles(tree, searchText);
  if (candidatePaths.length === 0) {
    const reason = "Couldn't find any source files that look related to this description.";
    await recordDiagnosisResult(ticket.id, reason, null);
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
    await recordDiagnosisResult(ticket.id, reason, null);
    return { status: "needs_human", reason };
  }

  const decision = await generateStructured({
    feature: "ai-bugfix-diagnosis",
    system: SYSTEM_PROMPT,
    prompt: buildDiagnosisPrompt(ticket, knowledge, files),
    createdBy: "system",
    schema: bugfixDecisionSchema,
    responseSchema: bugfixDecisionResponseSchema,
  });

  if (!decision.confident || !decision.targetFile || !decision.newFileContent) {
    const reason = decision.reason?.trim() || "AI couldn't confidently diagnose a fix for this from the available context.";
    await recordDiagnosisResult(ticket.id, reason, null);
    return { status: "needs_human", reason };
  }

  const targetFile = decision.targetFile.replace(/^\/+/, "");
  const wasShownThisFile = files.some((f) => f.path === targetFile);
  if (isDenylisted(targetFile) || !hasAllowedExtension(targetFile) || !wasShownThisFile) {
    const reason = `AI proposed changing "${targetFile}", which is outside what this pipeline is allowed to touch — flagging for manual review instead of proceeding.`;
    await recordDiagnosisResult(ticket.id, reason, null);
    return { status: "needs_human", reason };
  }

  const branchName = `ai-fix/${ticket.refNumber.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${Date.now()}`;
  await createBranch(ctx, branchName);
  await commitFile(ctx, branchName, targetFile, decision.newFileContent, `AI fix: ${ticket.title} (${ticket.refNumber})`);
  const { url } = await openDraftPullRequest(
    ctx, branchName, `[AI Draft] ${ticket.title} (${ticket.refNumber})`,
    buildPrBody(ticket, decision.explanation ?? "", targetFile)
  );

  const explanation = decision.explanation ?? "";
  await recordDiagnosisResult(ticket.id, explanation, url);
  return { status: "pr_opened", prUrl: url, explanation };
}
