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

---

## Active workstream: Tools Expansion Release 1

7 tools from the Wanago ERP Tools Expansion PRD (July 2026), built one at a time in PRD-recommended order: Executive Cockpit → Review & NPS engine → Tally export → Marketing automation/drip → Resource & availability calendar → Traveler companion + SOS → Vendor rate & availability portal (largest, started early/in parallel per the PRD). The PRD assumes a "4.0 core" (general ledger, BI/trip-profitability engine, PWA shell) that doesn't exist in this repo yet — each dependent tool builds against current module data instead, with TODOs marking the eventual swap (see `KNOWN_ISSUES.md`).

### Tool 1 — Executive Cockpit ✅ (2026-07-20)
Extended the existing `dashboard` module's company-wide (admin/super_admin) view rather than building a new `cockpit` module — it already had revenue/pipeline/forecast/founder-briefing, so a parallel module would have duplicated it (violates the PRD's own "no parallel systems" rule). Added: `computeCashPosition`/`computeGrossMargin`/`computePipelineValue`/`computeArOverdue`/`computeCockpitAlerts` to `dashboard.service.ts` (all pure, unit-tested); `CockpitFilters` (office + date-range) and `AlertsFeed` components; 5-minute auto-refresh in `useDashboard` (paused when tab hidden, skeleton only on first load). Gross margin reads `Booking.profitAmount` (already stamped by Ops on confirm) — no BI engine needed. Two of the PRD's five alert types (resource availability, statutory due-dates) are deferred — no `resources` module or tax calendar exists yet to back them.

### Tool 2 — Review & NPS Engine ✅ (2026-07-20)
New `src/modules/reviews/` (`reviewRequests`/`npsResponses` collections). `Booking.completedAt` + `scheduleReviewRequest()` wired into `updateBookingStatus` (booking.service.ts) — same best-effort/idempotency-checked convention as `createReferralBonusIfEligible`. A new daily cron (`/api/cron/review-requests`, mirrors `daily-reminders`) sends the request once `ReviewSettings.delayDays` has passed, via `sendWhatsAppSmart(purpose: "review_request")` + a new `sendReviewRequestEmail` (notify-server.ts). Public no-login `/review/{token}` page (mirrors `/book/{token}`) + `/api/public/review/{token}` (Admin SDK, same security model as `/api/public/booking-link` and `/api/public/referral`) capture the NPS score; a detractor response auto-creates a `tickets` doc (`sourceType: "nps_detractor"`, `linkedBookingId`, assigned to the original agent) directly via Admin SDK. Reputation dashboard + settings at `/reviews`. **Correction discovered while building this**: `PROJECT_STATUS.md`/`KNOWN_ISSUES.md` previously said WhatsApp had no outside-24h-window template support at all — untrue, `sendWhatsAppSmart`/`template-router.ts` already implements it fully; docs fixed. Real remaining dependency: getting a `review_request` template approved by Meta (business-side, not code).

### Tool 3 — Tally Export / Accounting Bridge ✅ (2026-07-20)
New `src/modules/accounting/tally/` at `/accounting/tally` (added to the existing "Finance" nav group alongside Invoices/Payments/Expenses). Since there's no GL/chart-of-accounts anywhere in the repo, Invoices/Payments/Expenses are treated as implicit Sales/Receipt/Payment vouchers respectively — the pure voucher/XML/CSV-building logic lives in `tally-export.service.ts` (`buildTallyVouchers`/`buildTallyXml`/`buildTallyCsv`, all unit-tested, including the easy-to-get-backwards Tally debit/credit `ISDEEMEDPOSITIVE` convention). New `tallyMappings` (editable ERP→Tally ledger table, mirrors the `whatsapp-templates` admin-table pattern; ships with 5 default system-account rows) and `tallyExports` (a log, not a file store — re-running a period regenerates identically) collections. GST only comes from Invoices (CGST+SGST, back-calculated from the tax-inclusive total — no IGST, since no per-party state-code data exists anywhere to determine inter-state vs intra-state); Payments/Expenses have no tax fields at all to export. Entirely client-side, same `Blob`+`URL.createObjectURL`+`<a download>` mechanism as the existing CSV/PDF export features — no new API route needed. **Process fix discovered while building this**: Tool 2's `/reviews` route was missing its `layout.tsx` (the `<AppShell requiredPage="...">` wrapper every other route uses for sidebar chrome + RBAC gating) — added retroactively; `/accounting/tally` shipped with one from the start.

### Tool 4 — Marketing Automation / Drip Journeys ✅ (2026-07-20)
New `src/modules/journeys/` at `/journeys` (Marketing nav group). `campaigns` was found to have zero send/segment/analytics capability (pure budget/attribution ledger) so journeys is a new module, not an extension — an optional `campaignId` loose link only. Client/server split follows Tool 2's precedent exactly: `journey.service.ts` (client SDK, called from `quotation.service.ts`'s `sendQuotation()` and `booking.service.ts`'s `updateBookingStatus()`) only ever *creates* a `journeyRuns` doc; `journey-engine.server.ts` (Admin SDK, imported only by the new `/api/cron/journey-engine` route) does every actual `sendWhatsAppSmart`/email/notify send, since that needs the Admin SDK and can't run in a browser bundle — so even an "instant" trigger's first action waits for the next daily engine pass, never fires synchronously. Pure `decideAfterStep()` (chain into the next action / defer at a `wait` / complete) is unit-tested in isolation from the Admin-SDK orchestration around it, matching how this codebase generally doesn't unit-test cron routes directly, only the pure logic inside them. New `Customer.marketingOptOut`/`Lead.marketingOptOut` fields (none existed anywhere before — grepped and confirmed), checked at journey-entry and again at every send. Segments approximate "region incl. Gulf NRI"/"spend" with a city-substring filter and the existing `computeCustomerSegment` (newly extracted from `CustomersPage.tsx` into a reusable `computeCustomerSegments()` so journeys don't re-derive the same aggregation) — documented as approximations, not real data. "Create task" reuses `notifyUserServer` (assigns the agent a notification) rather than inventing a 4th collection, since no generic task-tracking system exists anywhere in the app. Added a `"marketing"` `NotificationCategory` (didn't exist before) for these sends.
