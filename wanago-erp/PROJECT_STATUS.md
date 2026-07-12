# WANAGO ERP — PROJECT STATUS

_Last updated: 2026-07-12_

## Current Phase

Core ERP build-out is substantially complete (~40 feature modules). Active workstream: **non-AI platform gaps** (WhatsApp inbox, global search, sales performance unification, reports buildout) — see `PROJECT_ROADMAP.md`. A separate, independent workstream is handling AI/Gemini integration (`aiassistant`, `hr-chat`, `ai-assistant`, `ai-core`) — not tracked in this doc.

## What's built

- **CRM/Sales**: Leads, Customers, Suppliers, Bookings (Finance+Ops dual-approval), Quotations (Finance approval, branded PDF, auto-email, convert-to-booking), Itineraries, Itinerary Brochures (branded PDF), Packages, Campaigns
- **Finance**: Invoices, Payments, Expenses
- **HR/People**: HRMS (attendance w/ geofencing + selfie check-in, payroll, leaves, org chart, document hub, regularization), Recruitment/ATS, Onboarding, Onboarding Training (interactive walkthroughs + TTS voiceover), Performance (goals + reviews), Goals (company OKRs), Leave Policy, ESS
- **Sales performance**: Incentives (computed tiered incentive/bonus engine), Sales Team dashboard (leads+bookings+incentives merged), personal role-scoped dashboards (Sales, Marketing, HR, Finance, Operations)
- **Ops/Collab**: Team Space (Slack-style chat), Tickets, Assets, Call Logs, Notifications, Digests, Help Center, Training (formal programs)
- **Admin**: Users/RBAC/permissions, Integrations (secret management for Twilio/Resend/Gmail/Google TTS/Anthropic), System Health, Usage & Quotas (Firebase + Supabase), Activity log, Trash/restore, Org Explorer, Data Export, Offices, Holidays, Announcements
- **Reporting pipeline**: One-way Firestore→Supabase mirror (`cron/sync-supabase`) feeding a customer-retention cohort report; `reports` module is otherwise a single tabbed page pulling live from each module's own service
- **Notifications**: Email (Gmail SMTP + Resend), WhatsApp (Meta Cloud API direct, **two-way** — outbound sender + inbound webhook + `whatsapp-inbox` module for customer conversations; no message templates yet for outside-24h-window sends)
- **Global Search**: `⌘K`/header search bar, client-side index over Customers/Leads/Bookings/Itineraries/Quotations/Candidates
- **AI** (separate workstream, not detailed here): `aiassistant`, `hr-chat`, `ai-assistant` API + voice transcription, `ai-core`

## Known gaps (see `PROJECT_ROADMAP.md` for the plan)

- WhatsApp still has no message-template support for messages sent outside a customer's 24h reply window (Meta requires pre-approved templates for that case regardless of provider)
- Global Search doesn't cover Suppliers/Packages/Invoices (out of scope for Phase 2; revisit if needed) and is client-side only — would need a hosted index (Algolia/Typesense) if data volume grows an order of magnitude past ~2,000 records
- Sales performance data lives in 3 disconnected-ish places (`incentives`, `sales-team`, `performance/*`) with real but partial cross-referencing; no unified hub view
- `reports` module is a single 291-line page, not a proper module (no schemas/services/hooks split); only one computed report (customer retention) beyond raw per-module dumps
- No automated test suite (no jest/vitest/playwright in `package.json`)

## Infra

- Firebase project ID: `wanago-erp` (Firestore + Auth + Storage, Admin SDK server-side)
- Supabase: narrow reporting mirror only (`reporting_customers`, `reporting_bookings` tables), not a primary datastore
- Hosting/cron: Vercel (Vercel Cron drives `cron/daily-reminders`, `cron/sync-supabase`)

## Process note

This file, `PROJECT_ROADMAP.md`, `KNOWN_ISSUES.md`, and `CHANGELOG.md` must be updated as part of the "done" checklist for each completed phase — they had drifted badly stale (described a pre-Phase-5, dashboard-in-progress state) before this 2026-07-12 rewrite.
