# CHANGELOG

## 2026-07-20 (Tools Expansion Release 1, Tool 4 — Marketing Automation / Drip Journeys)

- New `src/modules/journeys/` at `/journeys` (Marketing nav group) — config-driven journeys: trigger (quote sent / quote unaccepted after N days / trip completed) → ordered steps (wait, send WhatsApp, send email, notify agent, add to segment)
- New `Customer.marketingOptOut`/`Lead.marketingOptOut` fields + form checkboxes — enforced at journey-entry and again at every send; nothing like this existed anywhere in the app before
- New `journeys`/`journeyRuns`/`segments` collections; a segment's membership is always computed live from its filters, never stored
- Client/server split (mirrors Tool 2's `scheduleReviewRequest`): triggers only ever create a `journeyRuns` doc client-side; every actual send happens from the new daily `/api/cron/journey-engine` cron — steps advance at most once/day, never instantly, since `sendWhatsAppSmart` needs the Admin SDK and can't run in a browser bundle
- Extracted `computeCustomerSegments()` out of `CustomersPage.tsx` (was inlined there only) into `customers/utils/segment.ts` so the journeys segment resolver reuses the exact same aggregation instead of re-deriving it
- Per-journey analytics (entered/sent/replied/converted/revenue) as denormalized counters rolled forward by the cron; "replied"/"converted" are proxies (a WhatsApp reply / a booking created after entering), email "opens" aren't tracked at all (no pixel infra) — documented, not fabricated
- Added a `"marketing"` `NotificationCategory` (didn't exist before) so journey sends show up correctly in the notification bell/email styling
- 22 new unit tests (segment resolution, customer-segment aggregation, journey idempotency/opt-out, step-chaining sequencing) + 7 new Firestore rules tests, all passing against the local emulator

## 2026-07-20 (Tools Expansion Release 1, Tool 3 — Tally Export / Accounting Bridge)

- New `src/modules/accounting/tally/` at `/accounting/tally` (Finance nav group) — one-click export of a chosen period's approved invoices, payments, and paid expenses as Tally-compatible XML or a reconciliation CSV
- No GL exists, so Invoices/Payments/Expenses are exported as implicit Sales/Receipt/Payment vouchers; GST (CGST+SGST only, no IGST) flows only from Invoices since Payments/Expenses have no tax fields
- New editable `tallyMappings` table (expense category → Tally ledger name/group, plus the 5 system accounts) — unmapped categories still export, just flagged; new `tallyExports` log (counts + unmapped categories per run, no file content stored)
- 14 new unit tests covering the GST split math, the Tally debit/credit (`ISDEEMEDPOSITIVE`) convention, voucher construction, and XML escaping
- New Firestore rules for `tallyMappings` (admin-only write, same as `whatsappTemplates`) — 5 new rules-tests, all passing against the local emulator
- **Fixed a gap in Tool 2**: `/reviews` was missing its `layout.tsx` (`<AppShell requiredPage="reviews">`), so it had no sidebar chrome or RBAC page-gating — every other route wraps itself this way and it was missed; added retroactively

## 2026-07-20 (Tools Expansion Release 1, Tool 2 — Review & NPS Engine)

- New `src/modules/reviews/` — `reviewRequests`/`npsResponses` collections, per the PRD
- Booking completion now auto-schedules a review request: `Booking.completedAt` + idempotency-checked `scheduleReviewRequest()`, wired into `updateBookingStatus` the same best-effort way `createReferralBonusIfEligible` already works
- New daily cron `/api/cron/review-requests` (mirrors `daily-reminders`) sends the request via `sendWhatsAppSmart(purpose: "review_request")` + new `sendReviewRequestEmail` once `ReviewSettings.delayDays` (admin-configurable, default 2 days) has passed
- New public, no-login `/review/{token}` page + `/api/public/review/{token}` (same security model as `/book/{token}`/`/api/public/booking-link`) captures an NPS 0–10 score + comment
- Promoters (score ≥ threshold) get a Google review link; detractors (score ≤ threshold) auto-create a "Service Recovery" ticket (`tickets.sourceType: "nps_detractor"`, `linkedBookingId`, assigned to the original booking's agent) directly via Admin SDK
- New Reputation dashboard + settings at `/reviews` (NPS trend, response rate, promoter/passive/detractor split by destination/agent)
- New Firestore rules for `npsResponses` (admin-only write, same as `whatsappTemplates`); `reviewRequests` needed no dedicated rule (the existing catch-all's authenticated grant already covers it) — 8 new rules-tests, all passing against the local emulator
- 16 new unit tests (NPS classification, trend/response-rate/split compute functions)
- **Corrected a stale claim in `PROJECT_STATUS.md`/`KNOWN_ISSUES.md`**: WhatsApp template (HSM) support for outside-24h-window sends already existed (`sendWhatsAppSmart`/`template-router.ts`) — the docs said it didn't. Real remaining dependency: a `review_request` template needs Meta approval + registration in Admin → WhatsApp Templates (business-side, not code)

## 2026-07-20 (Tools Expansion Release 1, Tool 1 — Executive Cockpit)

- Extended `dashboard` module's company-wide (admin/super_admin) view instead of a new `cockpit` module — reuses `FounderBriefingCard`/`RevenueChart`/etc. rather than duplicating them
- New stat tiles: Cash Position (payments in − paid expenses), Gross Margin % (from `Booking.profitAmount`), Open Pipeline Value (from `Lead.budget`), AR Overdue
- New `AlertsFeed` — deep-links to overdue invoices and negative-margin bookings; `CockpitFilters` — office + date-range, feeding all cockpit numbers
- `useDashboard` now auto-refreshes every 5 minutes (paused when the tab is hidden) without re-showing the full-page skeleton after the first load
- New `dashboard.service.test.ts` (15 tests) covering every new compute function
- No GL/BI engine exists yet (Tools Expansion PRD's "4.0 core") — cockpit numbers are computed live off existing collections with TODOs left for the eventual swap; see `KNOWN_ISSUES.md`

## 2026-07-12 (Phase 2 — Global Search)

- New `src/modules/global-search/` — `cmdk` command palette (⌘K/Ctrl+K + header search bar), indexing Customers, Leads, Bookings, Itineraries, Quotations, Candidates
- Client-side index built from each module's existing `fetch*` service (no new Firestore queries, results automatically scoped to what the signed-in role already sees)
- `?view=<id>` deep-link param added to Leads/Customers/Bookings/Itineraries/Quotations/Recruitment pages so search results open straight into the record's detail view

## 2026-07-12 (Phase 1 — WhatsApp Inbox)

- Two-way WhatsApp: new `src/modules/whatsapp-inbox/` (conversation list, thread view, reply composer), inbound webhook (`/api/whatsapp/webhook`), outbound send route (`/api/whatsapp/send`)
- Migrated WhatsApp off Twilio onto Meta's WhatsApp Cloud API directly (`src/lib/whatsapp/meta-client.ts`) — cheaper (no Twilio markup) and replies within 24h of a customer's message are free
- Conversations auto-link to `customers` by phone-number match
- Admin → Integrations: replaced Twilio WhatsApp fields with Meta Cloud API fields (access token, phone number ID, webhook verify token, app secret)

## 2026-07-12

- Itinerary Brochure builder + branded PDF generation
- Admin panel Usage & Quotas widget (Firebase + Supabase)
- Fixed Cloud Monitoring error surfacing and System Health tab crash
- Corrected business name to "Wanago Tours & Travels" everywhere
- Rewrote `PROJECT_ROADMAP.md`/`PROJECT_STATUS.md`/`KNOWN_ISSUES.md`/this file to match actual repo state (Phase 0 of the non-AI platform-gaps workstream)

## 2026-07-11

- Supabase customer-retention reporting mirror (one-way Firestore→Supabase sync + cohort report)
- Personal role-scoped dashboards: Sales, Marketing, HR, Finance, Operations
- New Wanago brand logo + branded loading screen everywhere
- Security fixes: activity-log Firestore rule silently rejecting writes; open notification-relay vulnerability closed
- Fixed revenue chart/forecast conflating calendar months across years; eliminated dashboard's redundant/unbounded Firestore reads
- Fixed quotation status transitions blocking Convert to Booking

## 2026-07-10

- Geofenced attendance + suspicious-location flagging on check-in/out
- Conditional selfie + manager location-approval flow for check-in/out
- HR alerts/escalation for suspicious attendance and selfie check-in; map picker; in-house UPI payments
- Comprehensive QA pass — security, data-integrity, and UX bugs

## 2026-07-08 – 2026-07-09

- Branded quotation PDF template + auto-email on creation; auto-draft quotation on won lead
- Onboarding Training module (Stages 1–4): content structure, interactive walkthrough engine, Google Cloud TTS voiceover with free browser-speech fallback, hands-on practice forms, certificates, full-app `data-tour-id` coverage
- Team Space (Slack-style chat): channels, presence, attachments, voice, replies, reactions, mobile fixes
- Premium notification/welcome emails via Gmail SMTP; new-hire team announcements; Integrations panel fixes

## 2026-06-04 (earlier milestone, retained for history)

Completed: Authentication, Sidebar, Header. Fixed: Firebase Login. Known issues at the time: logo alignment, dashboard mismatch (both since resolved — see 2026-07-11/12 above).
