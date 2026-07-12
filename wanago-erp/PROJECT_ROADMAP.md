# WANAGO ERP — ROADMAP

_Last updated: 2026-07-12_

## Foundational phases — done

- Phase 1 Foundation ✅
- Phase 2 Authentication ✅
- Phase 3 Core Layout ✅
- Phase 4 Dashboard ✅ (role-scoped personal dashboards for Sales/Marketing/HR/Finance/Operations, plus main dashboard)

## Core modules — done (originally phases 5–19, all substantially built)

- Leads ✅ · Customers ✅ · Suppliers ✅ · Bookings ✅ (Finance+Ops dual approval) · Quotations ✅ (Finance approval, branded PDF, auto-email, convert-to-booking)
- Marketing (Campaigns) ✅ · Finance (Invoices, Payments, Expenses) ✅
- HRMS ✅ (attendance/geofencing, payroll, leaves, org chart, docs, regularization) · Recruitment ✅ · Onboarding + Onboarding Training ✅ · Performance (goals + reviews) ✅ · Goals (company OKRs) ✅
- Notifications ✅ (in-app + email); WhatsApp ⚠️ **outbound-only** (Twilio, no inbox — see Phase 1 below)
- Settings/Admin ✅ (RBAC, integrations, system health, usage quotas, trash, activity log)
- Team Space (Chat) ✅ · Tickets ✅ · Assets ✅ · Itineraries + Itinerary Brochures ✅ · Help Center ✅

## Not yet started

- Global Search (was Phase 18) — see Phase 2 below
- Firebase Security hardening pass, GitHub CI/CD, formal deployment pipeline, performance optimization pass, security hardening pass, production audit (Phases 20–25) — not scheduled in this workstream

---

## Active workstream: non-AI platform gaps

One phase at a time, each requiring approval before build starts. AI/Gemini integration is explicitly out of scope for this workstream (handled separately).

### Phase 0 — Documentation cleanup ✅ (2026-07-12)
Rewrote this doc, `PROJECT_STATUS.md`, `KNOWN_ISSUES.md`, `CHANGELOG.md` to match actual repo state. Going forward, update all four as part of each phase's done checklist.

### Phase 1 — Two-way WhatsApp Inbox ✅ (2026-07-12)
Built `src/modules/whatsapp-inbox/` (conversation list, thread view, reply composer) on **Meta's WhatsApp Cloud API directly** (not Twilio — chosen because replies within a customer's 24h session window are free on Meta's own pricing, whereas Twilio adds a per-message markup on top regardless). Migrated the existing outbound sender (`src/app/api/notify/whatsapp/route.ts`) off Twilio onto the same Meta client (`src/lib/whatsapp/meta-client.ts`) so there's only one WhatsApp integration. New inbound webhook at `src/app/api/whatsapp/webhook/route.ts` (GET verification handshake + POST message/status ingestion, HMAC-signature-verified). New collections `whatsappConversations`/`whatsappMessages`; conversations auto-link to `customers` by phone-number match (full-collection scan — fine at current scale, flagged for an indexed `phoneMatchKey` field if the customer list grows past a few thousand). Admin → Integrations now has a "WhatsApp (Meta Cloud API)" section instead of Twilio.

### Phase 2 — Global Search ✅ (2026-07-12)
Built `src/modules/global-search/` — a `cmdk`-based command palette (⌘K/Ctrl+K, or the header search bar) indexing Customers, Leads, Bookings, Itineraries, Quotations, and Candidates. Client-side approach (confirmed: ~2,000 records total today) — the index is built by calling each module's existing `fetch*` service, so results are automatically scoped to whatever that role already sees on the normal list page; no new Firestore queries, no hosted search service. Index is cached in memory for 3 minutes per session. Selecting a result deep-links into that record's page via a new `?view=<id>` param, wired into all 6 target pages' detail modals.

### Phase 3 — Sales Performance Hub (not started)
Unify `incentives`, `sales-team`, `goals`, `performance/goals`, `performance/reviews` into one hub view rather than building a new leaderboard from scratch. `sales-team`'s existing hook already merges leads+bookings+incentives — that's the closest existing prototype.

### Phase 4 — Reports buildout (not started)
Restructure `src/modules/reports` (currently a single 291-line page) into schemas/services/hooks/components. Add sales trend analysis (moving averages, MoM/YoY) and `recharts` visualizations on top of the existing Supabase customer-retention pipeline.
