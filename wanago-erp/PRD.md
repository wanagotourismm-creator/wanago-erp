# WANAGO ERP — COMPLETE PRODUCT REQUIREMENTS DOCUMENT

_Last updated: 2026-07-16 · Companion to `PROJECT_STATUS.md`, `PROJECT_ROADMAP.md`, `KNOWN_ISSUES.md` (module-level detail) — this document adds the AI/Intelligence layer those files explicitly exclude, plus the strategic question of productizing this into a sellable tool._

---

## 0. How to use this document

1. **§3** is the ground truth of what exists today, module by module — verified against the actual code, not inferred from memory.
2. **§4** is the technical architecture underneath all of it.
3. **§6** is the honest answer to "what would it take to sell this to other travel agencies" — including the parts of that answer you may not want to hear.
4. **§7** is the prioritized roadmap, near to long term.

Every claim about current functionality was verified by reading the actual source this session, not assumed from naming.

---

## 1. Executive Summary

Wanago ERP is a full-stack operations platform for a travel agency — CRM, finance, HR, marketing, internal collaboration, and (as of this session) a genuine AI/automation layer, all built on Next.js 15 + Firebase. It is **not a thin MVP**: ~40 feature modules, most of them production-complete, covering everything from lead capture through booking fulfillment through employee payroll.

Two honest facts frame everything below:
- **It is entirely single-tenant.** One Firebase project, one company, zero data isolation between "customers of Wanago" and "customers of a hypothetical second travel agency using this software." This is not a config flag away from multi-tenant — it's a real architectural gap (§6).
- **The AI layer built this session is the newest and most distinctive part of the product**, and it was built with unusual discipline: every predictive claim is grounded in code-computed numbers, every AI-initiated write requires human confirmation, and every phase was verified live in production before the next one started. That discipline is worth preserving as the product grows.

---

## 2. Product Vision

**Today:** the internal operations system for one travel agency (Wanago Tours & Travels, Wayanad, Kerala — founded 2022), covering the full employee and customer lifecycle.

**The ambition being evaluated:** evolve this into a multi-tenant SaaS product other travel agencies could subscribe to — a genuine "Zoho/Salesforce for travel agencies" play, distinguished by the AI/automation layer most competitors in this space don't have.

This is a real strategic fork, not a feature request, and §6 treats it as one: what exists, what's missing, and two honest paths forward rather than a single glossy recommendation.

---

## 3. Current Product — Complete Module Inventory

Legend: 🟢 production-complete · 🟡 functional but scoped/thin · 🔴 known gap

### 3.1 CRM / Sales

| Module | State | Notes |
|---|---|---|
| **Leads** | 🟢 | Full pipeline (`new→contacted→follow_up→quoted→negotiation→won→lost`), auto-converts to Customer + seeds a draft Quotation on win, self-booking link generation, AI call-next-steps suggestions. |
| **Customers** | 🟢 | Segmentation (computed from enquiry/booking activity), referral-code issuance, enquiry history. |
| **Suppliers** | 🟢 | Vendor directory (Hotel/Transport/Activity/Guide/Other categories). |
| **Bookings** | 🟢 | Finance **and** Operations dual-approval workflow, resubmit-on-edit logic, going-cold/anomaly detection (this session), international-booking follow-up automation. |
| **Quotations** | 🟢 | Finance approval, branded PDF, auto-email, convert-to-booking, AI line-item drafting, expiry/staleness risk badges (this session). |
| **Itineraries** + **Brochures** | 🟢 | Day-by-day itinerary builder, branded PDF brochure generation, two-way sync with Packages, AI drafting. |
| **Packages** | 🟢 | Pre-built trip packages, can be generated from an Itinerary. |
| **Campaigns** | 🟢 | Marketing campaign tracking (channel, type, budget, dates, status). |

### 3.2 Finance

| Module | State | Notes |
|---|---|---|
| **Invoices** | 🟢 | Finance approval gate, per-invoice overdue detection (this session), PDF generation. |
| **Payments** | 🟢 | Linked to invoices, transactional balance updates. |
| **Expenses** | 🟢 | Category/vendor tracking. |

### 3.3 HR / People

| Module | State | Notes |
|---|---|---|
| **HRMS core** | 🟢 | Attendance (geofenced + selfie check-in), payroll, leave management, org chart, document hub, regularization requests, suspicious-attendance flagging. |
| **Recruitment/ATS** | 🟡 | Full CRUD + 8-stage pipeline, AI resume summarization + job-description drafting. Stage changes are dropdown-driven, not a Kanban board — CRUD-complete, thinner than a dedicated ATS. |
| **Onboarding + Onboarding Training** | 🟢 (genuine differentiator) | Real interactive on-page walkthroughs (targets actual UI elements), bilingual EN/ML narration via cached Google Cloud TTS, in-walkthrough practice forms writing to an isolated collection, auto-issued PDF certificates. The `mandatory` flag on modules is tracked but not enforced yet. |
| **Training (formal programs)** | 🟡 | Classic program/enrollment catalog — no content delivery or quizzes built in (that's the Onboarding Training module's job). |
| **Performance** | 🟢 | Goals + review cycle with acknowledgment workflow, AI review-note polishing. No 360-feedback or calibration. |
| **Goals (company OKRs)** | 🟡 | Separate system from Performance's Goals — near-identical naming, no shared schema (flagged in `KNOWN_ISSUES.md`). |
| **ESS** (Employee Self-Service) | 🟢 | Apply leave, clock in/out, request corrections, request assets, report IT issues — the employee-facing surface for HRMS. |

### 3.4 Sales Performance

| Module | State | Notes |
|---|---|---|
| **Incentives** | 🟡 | Computed tiered incentive/bonus engine — recomputed on every page load, not persisted. |
| **Sales Team Hub** | 🟡 | Merges leads + bookings + incentives — the closest existing prototype for a real unified hub (`PROJECT_ROADMAP.md` Phase 3, not started). |
| **Role dashboards** | 🟢 | Personal scoped dashboards for Sales/Marketing/HR/Finance/Operations, plus the main dashboard. |

### 3.5 Ops / Collaboration

| Module | State | Notes |
|---|---|---|
| **Team Space** | 🟢 | Slack-style chat — channels (public + department-gated announcement channels), DMs, threading, reactions, read receipts, file/image/video attachments. No typing indicators. |
| **Tickets** | 🟢 | Internal IT/support ticketing. |
| **Assets** | 🟢 | Inventory + employee request/approval flow. |
| **Call Logs** | 🟢 | Sales call tracking with AI next-step suggestions. |
| **Notifications** | 🟢 | In-app + email (Gmail SMTP + Resend fallback). |
| **Digests** | 🟢 | Weekly sales leaderboard, founder briefing, AI Insights report (§3.10). |
| **Help Center** | 🟢 | Internal knowledge base, powers the AI Assistant's help-doc grounding. |

### 3.6 Marketing & Growth

| Module | State | Notes |
|---|---|---|
| **WhatsApp Inbox** | 🟡 | **Two-way**, Meta Cloud API direct (not Twilio — avoids per-message markup). No message-template support yet, so business-initiated messages outside a customer's 24h reply window are impossible — a real functional ceiling on proactive WhatsApp outreach. |
| **Referral Program** | 🟢 | Rich module: customer referrals *and* freelance "referral partner" referrals (distinct bonus rates), poster-kit management, bulk share-kit emailer, public `/r/{code}` landing pages, click analytics. |
| **Forms** | 🟢 | Dynamic form builder (8 field types, conditional visibility), public shareable links, auto-creates a Lead from mapped answers — a real, clean automation. |
| **Intake** | 🟢 | Quick-inquiry public capture form. |

### 3.7 Customer / Partner Portals

🟡 — Functionally complete for their current scope but narrow. Customer portal: bookings, package browsing, booking requests, own referral stats. Partner portal: stats dashboard, leaderboard, poster access, refer-someone form. Both authenticate via synthetic Firebase Auth uids (`cust_{id}`/`partner_{id}`) sharing the staff Auth instance — a documented, accepted quirk, not a bug.

### 3.8 Admin & Platform

| Sub-area | What it does |
|---|---|
| Users / RBAC | Staff account CRUD; 9 fixed system roles (`super_admin` through `support`) with **editable per-role permissions** (not editable: which roles exist, or which pages a role can navigate to at all). |
| Integrations | Single global Firestore doc (`integrationSecrets/keys`) holding Resend/Gmail/Google TTS/Meta WhatsApp credentials. Firebase/Supabase/Gemini/Groq keys are deploy-time env vars, not in this doc. |
| System Health | Firestore collection-count pings + last-activity check. |
| Usage & Quotas | Tracks against Firebase Spark (free-tier) daily limits — explicitly not a real cost/billing view. |
| Activity Log | Read-only audit feed. |
| Trash / Restore | Soft-delete recovery across every collection. |
| **"Org Explorer"** | ⚠️ Misleadingly named — it's a raw Firestore document browser/deleter, not an org-chart or tenant-management tool. |
| Data Export | CSV export for leads/customers/bookings/invoices/payments. |
| Offices, Holidays, Announcements | Reference data + broadcast-to-Team-Space messaging. |
| Company Settings | One `settings/company` doc (name, address, GST, currency) — the only genuinely tenant-parameterizable surface today, and even it isn't consistently read (see §6.1). |

### 3.9 Reporting

🔴 Thinnest module in the product. `ReportsPage.tsx` is a single 291-line page with no schema/service/hook split — each tab calls another module's fetch function directly and exports CSV/PDF. Exactly one real computed report exists (customer-retention cohorts, via a one-way Firestore→Supabase mirror); everything else is a raw filtered dump. `PROJECT_ROADMAP.md` Phase 4 (not started) plans a proper restructure + trend analysis.

### 3.10 AI & Intelligence Layer (built this session)

The newest layer, and the one this session focused on end-to-end — see the companion doc published earlier this session for full detail; summarized here for completeness:

- **Unified AI Assistant** — one agentic assistant (replacing two weaker, doc-only ones) with a tool-calling loop over live business data, HR policy, and help docs. Write actions (`createLead`, `createQuotation`) always require human confirmation before executing — the model never writes directly.
- **AI Insights** — weekly narrative report (`/insights`) where code computes every number and exactly one LLM call narrates it. Never the reverse.
- **ML Predictions** — first Python in the repo (`api/ml/forecast.py`, Vercel-native serverless), revenue forecasting + lead-conversion modeling, both with an honesty floor: below a minimum data threshold, it reports "not enough data" rather than fabricate a number. Currently inactive by design — real booking/lead volume is still near-zero.
- **Proactive Automation** — 6 risk signals (quotation expiry/staleness, stuck approvals, overdue invoices, going-cold customers, booking anomalies) turned into same-day notifications instead of sitting passively in a dashboard card.
- **Search & Navigation** — `⌘K` global search covering 13 record types + a role-filtered page-jump layer.
- **Inline Risk Badges** — the same signals from Proactive Automation surfaced directly on the Quotations/Bookings tables.
- **Query Efficiency** — mutation-triggered full-collection refetches replaced with single-document refetches; a small TTL cache added for reference data (offices/packages/customers) fetched repeatedly for bulk-import matching and segmentation.

---

## 4. Architecture Snapshot

- **Stack**: Next.js 15 (App Router), TypeScript, Firebase (Firestore + Auth + Storage), Tailwind, deployed on Vercel (single project, `bom1` region).
- **Pattern**: feature-based module structure, repository pattern (`BaseRepository<T>` wrapping Firestore CRUD) + service layer, per `PROJECT_RULES.md`.
- **AI**: `src/modules/ai-core/services/geminiService.ts` — Gemini-first, Groq-fallback, both free-tier. No native function-calling on either provider; tool-calling is hand-built on top of JSON-mode structured output.
- **Secondary datastore**: Supabase, narrow one-way reporting mirror only (`reporting_customers`, `reporting_bookings`) — not a primary datastore.
- **No automated test suite.** No CI/CD (no `.github/` workflows at all — deployment is Vercel's git-push auto-deploy, unguarded by any pre-merge check beyond the build itself).
- **Standing engineering conventions worth preserving**:
  1. *Code computes, AI narrates* — no predictive/analytics surface lets a model state a figure it didn't compute in plain code.
  2. Firestore's catch-all rule (`match /{collection}/{id}`) is OR'd with dedicated rules, not overridden by them — every new restricted collection needs an explicit exclusion, checked and fixed twice this session.
  3. AI write actions execute through the same client-side service functions the manual UI uses (propose → confirm → client executes), never a server-side Admin SDK write — preserves Firestore-rules authorization without duplicating business logic.

---

## 5. Known Gaps & Technical Debt

Consolidated from `KNOWN_ISSUES.md` plus this session's findings:

- **No automated test suite** — every phase this session leaned on manual production verification (deploy, curl, eyeball). Highest-leverage starting point: unit tests for the pure computation functions in `insights.service.ts` (deterministic, already isolated, load-bearing for both notifications and UI badges).
- **No CI/CD** — no pre-merge gate beyond Vercel's own build step. A real type error shipped past local verification once this session and was only caught at deploy time (traced to a `tsc | head` exit-code masking bug, now known and documented).
- **WhatsApp has no message templates** — outside a customer's 24h reply window, no business-initiated message is possible. A real ceiling on proactive outreach via the channel customers actually use most.
- **Fragmented sales-performance data** — `incentives`/`sales-team`/`goals`/`performance/goals` are four near-overlapping systems with no shared schema.
- **`Reports` module is a stub** relative to the rest of the product's maturity.
- **Global Search is client-side-only** — fine at current scale (~2,000 records), would need a hosted index (Algolia/Typesense) at an order of magnitude more data.
- **Onboarding Training's `mandatory` flag isn't enforced** anywhere yet.
- **Leads table has no staleness badge** (data-join gap, intentionally not shipped with an inaccurate approximation — see the AI-layer companion doc).
- **Primary list pages have no pagination** — leads/quotations/bookings/customers/invoices all load their full collection on mount. Not a current problem (data volume is small), a real one waiting for data volume.

---

## 6. The SaaS Opportunity — What It Would Actually Take

This section exists because "make it a powerful tool I could sell" deserves an honest answer, not an encouraging one. The short version: **this is a strong internal product and a real re-architecture away from a sellable one.** Neither half of that sentence should be softened.

### 6.1 Current reality (verified, not assumed)

- **Zero tenant/org concept anywhere.** No `tenantId`/`orgId`/`companyId` field exists on any of the ~70 Firestore collections. `officeId` is branch-scoping *within* one company, not tenant isolation between companies.
- **One global `users` collection, one Firebase Auth pool.** Every auth check (`requireAuth`, `verifyRole`, `getUserRole`) looks up `users/{uid}` with no tenant qualifier.
- **Firestore security rules have no data-level isolation.** Every rule grants/denies purely on role + auth state. Under the current rules, if two companies' data lived in the same database, any authenticated user of Company A whose role qualifies could read/write Company B's records — there is no boundary to breach, because none exists. A rules rewrite would touch essentially all ~70 collection blocks, not a handful.
- **~120 hardcoded "Wanago Tours & Travels" references** outside the one parameterizable `settings/company` doc — spread across every AI system prompt, PDF templates, notification copy, and UI strings. None of them read from the settings doc today.
- **Zero billing/subscription infrastructure.** No Stripe/Razorpay/equivalent dependency, no pricing-plan entity, no subscription lifecycle anywhere in the codebase.
- **Zero infrastructure *automation* for provisioning a new tenant** — a manual runbook now exists (`PROVISIONING.md`), but no Terraform/Pulumi/CDK, no scripting to spin up a new isolated Firebase project or Vercel deployment. No CI/CD at all.
- **Integrations are single-tenant by construction** — one Firestore document holds one global set of API keys for the whole app.

None of this is a criticism of the build — it was correctly built as what it is: one company's internal system, done well. It's just not adjacent to multi-tenant SaaS the way a config flag or a feature branch would be.

### 6.2 Two honest paths, not one recommendation

**Path A — Shared multi-tenant rewrite (the "real" SaaS architecture).**
Add `tenantId` to every collection, rewrite `firestore.rules` end to end (all ~70 blocks) to scope every read/write by tenant, make `users` tenant-aware, parameterize the ~120 hardcoded strings, build a real subscription/billing system, build a tenant-provisioning/onboarding flow, decide a pricing model, and only then start acquiring customers. This is the architecturally correct long-term answer — and it is a multi-month rewrite before the first paying customer, with real risk of introducing cross-tenant data leaks in the process if the rules rewrite isn't airtight (worth a dedicated security audit, not a confident "we tested it").

**Path B — Deployment-per-tenant (pragmatic, much faster to a first paying customer).**
Template the current repo; each new customer gets their own Firebase project + Vercel deployment, provisioned from the template (semi-automated at first, scripted later). No rules rewrite, no `tenantId` migration, no shared-infrastructure security risk — true data isolation for free, because it's physically separate infrastructure. The cost: higher marginal cost per customer (a Firebase project + Vercel deployment each), harder to ship a feature to "all tenants" atomically, and a real ceiling on how it scales past a few dozen customers before the operational overhead of managing N deployments catches up with you.

**The honest recommendation, if pushed for one:** Path B to validate there's actually a second travel agency willing to pay for this at all, *before* investing in Path A's rewrite. A shared-multi-tenant architecture is expensive to build and easy to get wrong; building it before there's a second real customer risks months of work validating a market assumption that a single sales conversation could test first.

### 6.3 What "productization" needs regardless of path

Independent of A vs. B, a sellable product needs things that don't exist today:
- ~~**Removing the ~120 hardcoded references**~~ — **done.** Every AI prompt, PDF template, notification, and client-side UI string now reads company name/branding from `settings/company` (server-side via the new `getCompanySettingsServer()`, client-side via `useCompanySettings()`/`usePublicBranding()`) instead of a literal "Wanago Tours & Travels". Genuine one-off content — the founder narrative, the "we know you wanna go" wordmark pun, the Kerala map default, the brochure's legal disclaimer — was deliberately left alone; those aren't template fields.
- **Onboarding flow** for a brand-new company (their own admin account, their own company-settings doc filled in, guided setup) — today, every setting is configured by hand by someone with direct Firestore access. **`PROVISIONING.md`** now documents this as a manual runbook (Path B: new Firebase project + new Supabase project + new Vercel deployment + hand-bootstrapped first admin) — a checklist, not automation. Worth scripting once repeating it by hand becomes the actual bottleneck.
- **Pricing model** — per-seat, per-office, feature-tiered, usage-based (AI calls are a real marginal cost — Gemini/Groq free tiers won't hold at scale). Needs its own decision process, not bundled into this document.
- **A real support/success motion** — this document itself models the kind of internal reference a support team would need; a customer-facing knowledge base and support channel don't exist yet (the Help Center module is staff-facing only).
- **Legal**: a real Terms of Service and Privacy Policy that account for holding another company's customer PII, not just Wanago's own.

---

## 7. Roadmap

### Near-term (small, self-contained — extends the AI-layer roadmap from earlier this session)
- Leads staleness badge (needs `fetchCallLogs()` wired into the Leads page)
- Deep-link the 7 newly-searchable record types (`?view=<id>` support)
- Command-palette write actions (reuse the AI assistant's existing propose/confirm flow)

### Medium-term (real design decisions)
- Primary list-page pagination (before data volume makes it urgent, not after)
- Broader AI write-tool coverage (update/delete/approve — decide which actions are safe to expose to a model proposal at all)
- Unify the 4 fragmented sales-performance systems (`incentives`/`sales-team`/`goals`/`performance/goals`) into one hub, per `PROJECT_ROADMAP.md` Phase 3
- Restructure `Reports` into a real module, per `PROJECT_ROADMAP.md` Phase 4
- WhatsApp message templates (unblocks proactive outbound messaging)
- **Decide A vs. B (§6.2) explicitly** — this is the highest-leverage decision on this entire roadmap and shouldn't be made implicitly by momentum

### Long-term (revisit when a precondition changes)
- Real ML models beyond the current two — blocked on data volume, not engineering; self-activates once thresholds clear, no code change needed
- A real automated test suite, starting with `insights.service.ts`'s pure functions
- If Path A is chosen: the full multi-tenancy rewrite, only after Path B (or an equivalent signal) has validated real external demand

---

## 8. Reference Map

| Area | Key files |
|---|---|
| AI assistant | `src/modules/ai-core/services/ai-assistant-orchestrator.ts`, `ai-tools.ts`, `src/modules/aiassistant/` |
| AI Insights / Predictions | `src/modules/digests/services/ai-insights.service.ts`, `api/ml/forecast.py` |
| Automation | `src/app/api/cron/daily-reminders/route.ts` |
| Search | `src/modules/global-search/` |
| Risk signals (shared) | `src/modules/dashboard/services/insights.service.ts` |
| Query cache | `src/lib/firebase/data-cache.ts` |
| Firestore rules | `firestore.rules` — check the catch-all exclusion list before adding any restricted collection |
| RBAC | `src/lib/rbac.ts`, `src/lib/constants.ts` (`SYSTEM_ROLES`) |
| Company settings (the one tenant-parameterizable surface) | `src/modules/admin/settings/services/company-settings.service.ts` |
| Integrations/secrets | `integrationSecrets/keys` (single global Firestore doc) |
| Module-by-module baseline | `PROJECT_STATUS.md`, `PROJECT_ROADMAP.md`, `KNOWN_ISSUES.md` |
