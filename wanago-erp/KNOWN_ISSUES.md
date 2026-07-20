# KNOWN ISSUES

_Last updated: 2026-07-12_

## Gaps (not bugs, but real functional holes)

- ~~WhatsApp has no message templates yet~~ **Corrected 2026-07-20 — this was wrong.** `src/lib/whatsapp/template-router.ts`'s `sendWhatsAppSmart()` already routes outside-24h-window sends to an approved Meta template (HSM) registered per-`purpose` in the `whatsappTemplates` collection (Admin → WhatsApp Templates), falling back to free text inside the window. Discovered while building the Review & NPS engine (Tools Expansion Release 1, Tool 2), which uses it directly. The one real remaining dependency is business-side: getting each needed template (e.g. `review_request`) approved by Meta and registered in the admin panel — not a code gap.
- **No global search.** Nothing indexes across customers/bookings/leads/itineraries/quotations/candidates today; each module is siloed to its own list/filter UI.
- **Sales performance data is fragmented.** `incentives` and `sales-team` compute on the fly (no persistence, recomputed every page load) and already cross-reference leads/bookings; `goals` (company OKRs) and `performance/goals`/`performance/reviews` (HR review cycle) are separate systems with near-identical naming (`goals` vs `performance/goals`) but no shared schema or identity type. No single view unifies them.
- **`reports` module is thin.** Just one 291-line page (`ReportsPage.tsx`) with no schemas/services/hooks — each tab calls another module's fetch function directly and exports to CSV/PDF. Only one true computed report exists (customer-retention cohorts via the Supabase mirror); everything else is a raw filtered dump.
- **No general ledger or BI/trip-profitability engine yet.** The Tools Expansion PRD (Release 1, July 2026) assumes both exist as "4.0 core pillars." Neither is built — the Executive Cockpit (see CHANGELOG 2026-07-20) reads cash/margin/pipeline numbers straight off `bookings`/`payments`/`expenses`/`leads`/`invoices` instead, with TODOs in `dashboard/types/index.ts` marking where a real GL/BI engine should plug in later. Two of the PRD's five cockpit alert types (low resource availability, statutory due-dates) aren't modeled yet for the same reason — no `resources` module or tax-calendar concept exists to back them.

## Stale-doc issue (resolved 2026-07-12)

Previously, `PROJECT_ROADMAP.md`/`PROJECT_STATUS.md`/`CHANGELOG.md` described a pre-Phase-5 "Dashboard in progress, logo alignment issues" state, dated 2026-06-04, despite ~40 modules and dozens of features having since shipped. Rewritten to match actual repo state; process note added to keep them current going forward.
