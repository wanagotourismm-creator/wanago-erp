// Thin Octokit wrapper for the AI auto-fix pipeline
// (src/modules/tickets/services/ai-bugfix.service.ts). This is the ONLY
// place in the app that holds/uses a GitHub token — kept out of the Python
// AI Employee brain entirely (see ai-bugfix.service.ts's doc comment for
// why) so a GitHub write credential never sits alongside the LLM-driven
// tool-choice loop that reads arbitrary user-authored ticket text.
//
// Single-file-patch only, by design: every function here operates on one
// path at a time. Multi-file diffs are out of scope for v1 (see the plan) —
// callers that need more than one file changed should treat that as
// "needs a human," not attempt it by calling these functions in a loop.
import { Octokit } from "@octokit/rest";
import { getIntegrationSecret } from "@/lib/get-integration-secret";

export type RepoTreeEntry = { path: string; type: "blob" | "tree" };

let cachedOctokit: { token: string; client: Octokit } | null = null;
let cachedTree: { owner: string; repo: string; entries: RepoTreeEntry[]; fetchedAt: number } | null = null;
const TREE_CACHE_TTL_MS = 5 * 60_000;

async function getClient(): Promise<Octokit | null> {
  const token = await getIntegrationSecret("githubToken", "GITHUB_TOKEN");
  if (!token) return null;
  if (cachedOctokit?.token === token) return cachedOctokit.client;
  const client = new Octokit({ auth: token });
  cachedOctokit = { token, client };
  return client;
}

async function getRepoConfig(): Promise<{ owner: string; repo: string } | null> {
  const repoSpec = await getIntegrationSecret("githubRepo", "GITHUB_REPO");
  if (!repoSpec || !repoSpec.includes("/")) return null;
  const [owner, repo] = repoSpec.split("/");
  return owner && repo ? { owner, repo } : null;
}

export type GithubContext = { client: Octokit; owner: string; repo: string };

export async function getGithubContext(): Promise<GithubContext | null> {
  const [client, repoConfig] = await Promise.all([getClient(), getRepoConfig()]);
  if (!client || !repoConfig) return null;
  return { client, ...repoConfig };
}

async function getDefaultBranch(ctx: GithubContext): Promise<string> {
  const { data } = await ctx.client.repos.get({ owner: ctx.owner, repo: ctx.repo });
  return data.default_branch;
}

// Recursive file-tree listing (paths only) — cached briefly so a single
// diagnosis run's several keyword-matching passes don't each pay a full
// tree fetch, without ever going so stale that a same-day repo change is
// invisible to it.
export async function fetchRepoTree(ctx: GithubContext): Promise<RepoTreeEntry[]> {
  if (cachedTree && cachedTree.owner === ctx.owner && cachedTree.repo === ctx.repo && Date.now() - cachedTree.fetchedAt < TREE_CACHE_TTL_MS) {
    return cachedTree.entries;
  }
  const defaultBranch = await getDefaultBranch(ctx);
  const { data: refData } = await ctx.client.git.getRef({ owner: ctx.owner, repo: ctx.repo, ref: `heads/${defaultBranch}` });
  const { data: tree } = await ctx.client.git.getTree({
    owner: ctx.owner, repo: ctx.repo, tree_sha: refData.object.sha, recursive: "true",
  });
  const entries: RepoTreeEntry[] = (tree.tree ?? [])
    .filter((t): t is typeof t & { path: string; type: "blob" | "tree" } => !!t.path && (t.type === "blob" || t.type === "tree"))
    .map((t) => ({ path: t.path, type: t.type as "blob" | "tree" }));
  cachedTree = { owner: ctx.owner, repo: ctx.repo, entries, fetchedAt: Date.now() };
  return entries;
}

export async function fetchFileContent(ctx: GithubContext, path: string): Promise<string | null> {
  try {
    const { data } = await ctx.client.repos.getContent({ owner: ctx.owner, repo: ctx.repo, path });
    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) return null;
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

// Creates a fresh branch off the current default branch (fails loudly if
// the branch name is already taken — callers should pass a unique,
// ticket-ref-derived name so this never silently collides).
export async function createBranch(ctx: GithubContext, branchName: string): Promise<void> {
  const defaultBranch = await getDefaultBranch(ctx);
  const { data: refData } = await ctx.client.git.getRef({ owner: ctx.owner, repo: ctx.repo, ref: `heads/${defaultBranch}` });
  await ctx.client.git.createRef({ owner: ctx.owner, repo: ctx.repo, ref: `refs/heads/${branchName}`, sha: refData.object.sha });
}

// Single-file create-or-update via the Contents API — deliberately not the
// lower-level tree/commit API, since that's exactly the shape that makes
// "one file, one change" trivial to enforce and multi-file diffs
// impossible to accidentally support later without a real code change here.
export async function commitFile(
  ctx: GithubContext, branchName: string, path: string, content: string, message: string
): Promise<void> {
  let existingSha: string | undefined;
  try {
    const { data } = await ctx.client.repos.getContent({ owner: ctx.owner, repo: ctx.repo, path, ref: branchName });
    if (!Array.isArray(data) && data.type === "file") existingSha = data.sha;
  } catch {
    // file doesn't exist on this branch yet — a genuinely new file, no sha needed
  }
  await ctx.client.repos.createOrUpdateFileContents({
    owner: ctx.owner, repo: ctx.repo, path, branch: branchName, message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    ...(existingSha ? { sha: existingSha } : {}),
  });
}

const AI_PROPOSED_LABEL = { name: "ai-proposed", color: "8B5CF6", description: "Opened automatically by the AI Employee — needs human review before merge" };

async function ensureLabel(ctx: GithubContext): Promise<void> {
  try {
    await ctx.client.issues.getLabel({ owner: ctx.owner, repo: ctx.repo, name: AI_PROPOSED_LABEL.name });
  } catch {
    try {
      await ctx.client.issues.createLabel({ owner: ctx.owner, repo: ctx.repo, ...AI_PROPOSED_LABEL });
    } catch {
      // best-effort — a failed label creation shouldn't block opening the PR itself
    }
  }
}

export async function openDraftPullRequest(
  ctx: GithubContext, branchName: string, title: string, body: string
): Promise<{ url: string; number: number }> {
  const defaultBranch = await getDefaultBranch(ctx);
  const { data: pr } = await ctx.client.pulls.create({
    owner: ctx.owner, repo: ctx.repo, head: branchName, base: defaultBranch, title, body, draft: true,
  });
  await ensureLabel(ctx);
  try {
    await ctx.client.issues.addLabels({ owner: ctx.owner, repo: ctx.repo, issue_number: pr.number, labels: [AI_PROPOSED_LABEL.name] });
  } catch {
    // best-effort — the PR existing and being a draft is the actual safety property, the label is just visibility
  }
  return { url: pr.html_url, number: pr.number };
}
