# CHANGELOG

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
