# KNOWN ISSUES

_Last updated: 2026-07-12_

## Gaps (not bugs, but real functional holes)

- **WhatsApp has no message templates yet.** Two-way messaging now works (`src/modules/whatsapp-inbox/`, Meta Cloud API direct, webhook at `src/app/api/whatsapp/webhook/route.ts`), but there's still no HSM/template handling — outside a 24h customer-reply window, Meta requires a pre-approved template for any business-initiated message, which isn't implemented. Staff can only reply to customers who've messaged in the last 24h.
- **No global search.** Nothing indexes across customers/bookings/leads/itineraries/quotations/candidates today; each module is siloed to its own list/filter UI.
- **Sales performance data is fragmented.** `incentives` and `sales-team` compute on the fly (no persistence, recomputed every page load) and already cross-reference leads/bookings; `goals` (company OKRs) and `performance/goals`/`performance/reviews` (HR review cycle) are separate systems with near-identical naming (`goals` vs `performance/goals`) but no shared schema or identity type. No single view unifies them.
- **`reports` module is thin.** Just one 291-line page (`ReportsPage.tsx`) with no schemas/services/hooks — each tab calls another module's fetch function directly and exports to CSV/PDF. Only one true computed report exists (customer-retention cohorts via the Supabase mirror); everything else is a raw filtered dump.
- **No automated test suite.** No jest/vitest/playwright in `package.json` — verification is manual.

## Stale-doc issue (resolved 2026-07-12)

Previously, `PROJECT_ROADMAP.md`/`PROJECT_STATUS.md`/`CHANGELOG.md` described a pre-Phase-5 "Dashboard in progress, logo alignment issues" state, dated 2026-06-04, despite ~40 modules and dozens of features having since shipped. Rewritten to match actual repo state; process note added to keep them current going forward.
