// Server-only — the unified AI assistant's tool registry. Read tools run
// directly against the Admin SDK (bypassing Firestore rules, same as every
// other server-side AI read in this app) since there's no authenticated
// client Firestore session available inside a Node API route. Write tools
// intentionally have no `run` — the orchestrator only validates their args
// and returns a proposal; the actual write happens client-side through the
// same service functions (createLead, createQuotation) the manual forms
// use, so authorization (firestore.rules) and business logic (ref numbers,
// customer matching) stay identical to a human-entered record. See
// src/modules/ai-core/services/ai-assistant-orchestrator.ts for the loop
// that calls these.
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { leadSchema } from "@/modules/leads/schemas";
import { quotationSchema } from "@/modules/quotations/schemas";

export type AiToolKind = "read" | "write";

export type AiTool = {
  name: string;
  kind: AiToolKind;
  description: string;
  argsSchema: z.ZodType<any>;
  // Read tools only — executed inline by the orchestrator. Write tools
  // never run server-side, so this is undefined for them.
  run?: (args: any) => Promise<unknown>;
  // Write tools only — a friendly pre-check before even showing the user a
  // proposal card; firestore.rules remains the real authorization boundary.
  allowedRoles?: string[];
};

const MAX_LIST_RESULTS = 15;

function sortByCreatedAtDesc<T extends { createdAt?: unknown }>(docs: T[]): T[] {
  const ms = (v: unknown): number => {
    if (!v) return 0;
    if (typeof v === "object" && v !== null && "toDate" in (v as any)) return (v as any).toDate().getTime();
    if (typeof v === "string") return new Date(v).getTime() || 0;
    return 0;
  };
  return [...docs].sort((a, b) => ms((b as any).createdAt) - ms((a as any).createdAt));
}

async function queryCollection(
  collection: string,
  wheres: [string, FirebaseFirestore.WhereFilterOp, unknown][]
): Promise<Record<string, unknown>[]> {
  const db = getAdminDb();
  if (!db) return [];
  let q: FirebaseFirestore.Query = db.collection(collection);
  for (const [field, op, value] of wheres) q = q.where(field, op, value);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function findByRefOrId(collection: string, refNumberOrId: string): Promise<Record<string, unknown> | null> {
  const db = getAdminDb();
  if (!db) return null;
  const byId = await db.collection(collection).doc(refNumberOrId).get();
  if (byId.exists) return { id: byId.id, ...byId.data() };
  const byRef = await db.collection(collection).where("refNumber", "==", refNumberOrId).limit(1).get();
  if (!byRef.empty) return { id: byRef.docs[0].id, ...byRef.docs[0].data() };
  return null;
}

// ── searchHelpArticles ─────────────────────────────────────────
// Mirrors the keyword-scoring logic in
// src/modules/helpcenter/services/help-article.service.ts (which runs
// client-side); reimplemented here against the Admin SDK since this tool
// runs inside a server route.
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

async function searchHelpArticlesTool(args: { query: string }): Promise<unknown> {
  const db = getAdminDb();
  if (!db) return { articles: [] };
  const snap = await db.collection(FIRESTORE_COLLECTIONS.HELP_ARTICLES).get();
  const queryTokens = new Set(tokenize(args.query));
  const scored = snap.docs.map((d) => {
    const data = d.data();
    const titleTokens = new Set(tokenize(String(data.title ?? "")));
    const keywordTokens = new Set((data.keywords ?? []).flatMap((k: string) => tokenize(k)));
    const categoryTokens = new Set(tokenize(String(data.category ?? "")));
    const contentTokens = new Set(tokenize(String(data.content ?? "")));
    let score = 0;
    for (const t of queryTokens) {
      if (titleTokens.has(t)) score += 3;
      if (keywordTokens.has(t)) score += 3;
      if (categoryTokens.has(t)) score += 2;
      if (contentTokens.has(t)) score += 1;
    }
    return { title: data.title, content: data.content, score };
  });
  const articles = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 3)
    .map(({ title, content }) => ({ title, content }));
  return { articles };
}

// ── getHrPolicyContext ─────────────────────────────────────────
// Lifted from the (now-retired) src/app/api/hr-chat/route.ts fetchPolicyContext.
const MAX_POLICY_CONTEXT_CHARS = 30_000;

async function getHrPolicyContextTool(): Promise<unknown> {
  const db = getAdminDb();
  if (!db) return { policyText: null };
  const snap = await db.collection(FIRESTORE_COLLECTIONS.HR_POLICY_DOCUMENTS)
    .where("docStatus", "==", "active").get();
  const docs = snap.docs
    .map((d) => ({ title: d.data().title as string, text: d.data().extractedText as string | null }))
    .filter((d): d is { title: string; text: string } => !!d.text);
  if (docs.length === 0) return { policyText: null };

  let combined = "";
  let truncated = false;
  for (const d of docs) {
    const section = `--- ${d.title} ---\n${d.text}\n\n`;
    if (combined.length + section.length > MAX_POLICY_CONTEXT_CHARS) { truncated = true; break; }
    combined += section;
  }
  return { policyText: combined + (truncated ? "\n[Some additional documents were omitted for length.]" : "") };
}

export const aiTools: AiTool[] = [
  {
    name: "searchHelpArticles",
    kind: "read",
    description: "Search the ERP's internal help documentation for how-to-use-the-app questions. Args: { query: string }.",
    argsSchema: z.object({ query: z.string().min(1) }),
    run: (args) => searchHelpArticlesTool(args),
  },
  {
    name: "getHrPolicyContext",
    kind: "read",
    description: "Fetch the full text of all active company HR policy documents (leave policy, attendance, conduct, etc). No args.",
    argsSchema: z.object({}),
    run: () => getHrPolicyContextTool(),
  },
  {
    name: "listLeads",
    kind: "read",
    description: "List sales leads, optionally filtered. Args: { stage?: string ('new'|'contacted'|'follow_up'|'quoted'|'negotiation'|'won'|'lost'), assignedTo?: string (uid) }.",
    argsSchema: z.object({ stage: z.string().optional(), assignedTo: z.string().optional() }),
    run: async (args: { stage?: string; assignedTo?: string }) => {
      const wheres: [string, FirebaseFirestore.WhereFilterOp, unknown][] = [];
      if (args.stage) wheres.push(["stage", "==", args.stage]);
      if (args.assignedTo) wheres.push(["assignedTo", "==", args.assignedTo]);
      const docs = await queryCollection(FIRESTORE_COLLECTIONS.LEADS, wheres);
      const leads = sortByCreatedAtDesc(docs).slice(0, MAX_LIST_RESULTS).map((l: any) => ({
        refNumber: l.refNumber, name: l.name, phone: l.phone, destination: l.destination,
        stage: l.stage, priority: l.priority, assignedTo: l.assignedTo, source: l.source,
      }));
      return { leads };
    },
  },
  {
    name: "getLeadById",
    kind: "read",
    description: "Get full details of one lead by its refNumber (e.g. 'LD-0001') or document id. Args: { refNumberOrId: string }.",
    argsSchema: z.object({ refNumberOrId: z.string().min(1) }),
    run: async (args: { refNumberOrId: string }) => {
      const lead = await findByRefOrId(FIRESTORE_COLLECTIONS.LEADS, args.refNumberOrId);
      return { lead };
    },
  },
  {
    name: "listQuotations",
    kind: "read",
    description: "List quotations, optionally filtered by status. Args: { status?: string ('draft'|'sent'|'accepted'|'rejected') }.",
    argsSchema: z.object({ status: z.string().optional() }),
    run: async (args: { status?: string }) => {
      const wheres: [string, FirebaseFirestore.WhereFilterOp, unknown][] = [];
      if (args.status) wheres.push(["status", "==", args.status]);
      const docs = await queryCollection(FIRESTORE_COLLECTIONS.QUOTATIONS, wheres);
      const quotations = sortByCreatedAtDesc(docs).slice(0, MAX_LIST_RESULTS).map((q: any) => ({
        refNumber: q.refNumber, customerName: q.customerName, destination: q.destination,
        status: q.status, totalAmount: q.totalAmount, financeApprovalStatus: q.financeApprovalStatus,
      }));
      return { quotations };
    },
  },
  {
    name: "getQuotationById",
    kind: "read",
    description: "Get full details of one quotation by its refNumber (e.g. 'QT-0001') or document id. Args: { refNumberOrId: string }.",
    argsSchema: z.object({ refNumberOrId: z.string().min(1) }),
    run: async (args: { refNumberOrId: string }) => {
      const quotation = await findByRefOrId(FIRESTORE_COLLECTIONS.QUOTATIONS, args.refNumberOrId);
      return { quotation };
    },
  },
  {
    name: "listInvoices",
    kind: "read",
    description: "List invoices, optionally filtered by status. Args: { status?: string ('draft'|'sent'|'unpaid'|'partial'|'paid'|'overdue') }.",
    argsSchema: z.object({ status: z.string().optional() }),
    run: async (args: { status?: string }) => {
      const wheres: [string, FirebaseFirestore.WhereFilterOp, unknown][] = [];
      if (args.status) wheres.push(["status", "==", args.status]);
      const docs = await queryCollection(FIRESTORE_COLLECTIONS.INVOICES, wheres);
      const invoices = sortByCreatedAtDesc(docs).slice(0, MAX_LIST_RESULTS).map((i: any) => ({
        refNumber: i.refNumber, customerName: i.customerName, status: i.status,
        totalAmount: i.totalAmount, amountPaid: i.amountPaid, dueDate: i.dueDate,
      }));
      return { invoices };
    },
  },
  {
    name: "listCustomers",
    kind: "read",
    description: "List customers, optionally filtered by type. Args: { customerType?: string ('individual'|'corporate') }.",
    argsSchema: z.object({ customerType: z.string().optional() }),
    run: async (args: { customerType?: string }) => {
      const wheres: [string, FirebaseFirestore.WhereFilterOp, unknown][] = [];
      if (args.customerType) wheres.push(["customerType", "==", args.customerType]);
      const docs = await queryCollection(FIRESTORE_COLLECTIONS.CUSTOMERS, wheres);
      const customers = sortByCreatedAtDesc(docs).slice(0, MAX_LIST_RESULTS).map((c: any) => ({
        refNumber: c.refNumber, fullName: c.fullName, phone: c.phone, email: c.email,
        customerType: c.customerType, city: c.city,
      }));
      return { customers };
    },
  },
  {
    name: "getCustomerById",
    kind: "read",
    description: "Get full details of one customer by its refNumber (e.g. 'CUS-0001') or document id. Args: { refNumberOrId: string }.",
    argsSchema: z.object({ refNumberOrId: z.string().min(1) }),
    run: async (args: { refNumberOrId: string }) => {
      const customer = await findByRefOrId(FIRESTORE_COLLECTIONS.CUSTOMERS, args.refNumberOrId);
      return { customer };
    },
  },
  {
    name: "createLead",
    kind: "write",
    description:
      "Propose creating a new sales lead. Args must match: { name: string, phone: string, destination: string, email?: string, tripType?: string, travelDate?: string, duration?: number, pax?: number, budget?: number, source?: string, notes?: string, officeId: string, officeName: string }. officeId/officeName should be copied from context if known, otherwise ask the user which office.",
    argsSchema: leadSchema,
    allowedRoles: undefined, // any authenticated staff member, matches firestore.rules `leads` create rule
  },
  {
    name: "createQuotation",
    kind: "write",
    description:
      "Propose creating a draft quotation (never auto-sent to the customer). Args must match: { customerId: string, customerName: string, customerPhone: string, destination: string, pax: number, lineItems: {description: string, amount: number}[], officeId: string, officeName: string, taxRate?: number, notes?: string }. Look up the customer first with listCustomers/getCustomerById to get a real customerId — never invent one.",
    argsSchema: quotationSchema,
    allowedRoles: ["super_admin", "admin", "sales"], // matches firestore.rules `quotations` create rule
  },
];

export function getTool(name: string): AiTool | undefined {
  return aiTools.find((t) => t.name === name);
}

export function describeToolsForPrompt(): string {
  return aiTools.map((t) => `- ${t.name} (${t.kind}): ${t.description}`).join("\n");
}
