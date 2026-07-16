# Tenant Provisioning Runbook

**Purpose:** step-by-step instructions for spinning up a brand-new, fully
isolated deployment of this software for a *different* travel agency —
Path B from `PRD.md` §6.2 (deployment-per-tenant), now that the branding
de-hardcoding work (§6.3's "~120 hardcoded references") is done.

**Status:** this is documentation only — no second tenant has been
provisioned yet (per `PRD.md` §6, this is deliberately speculative work,
done before any real second customer exists). Nothing in this document
creates real cloud infrastructure by itself; follow it when there's an
actual agency ready to onboard.

**Who this is for:** whoever is doing the provisioning — written so it
doesn't assume deep technical background. Every step says exactly which
website to open and what to click.

**Time estimate:** 1–2 hours for a careful first run-through.

---

## 0. The architecture in one paragraph

Every tenant runs the **exact same codebase** (this one GitHub repo).
What makes tenants separate and unable to see each other's data is that
each one gets **its own Firebase project** (own database, own login
system) and **its own Supabase project** (own file storage) — real,
physically separate infrastructure, not a shared database with a filter.
Each tenant also gets **its own Vercel deployment**, connected to this
same repo, but configured with its own set of environment variables
pointing at its own Firebase/Supabase projects. Pushing a code update to
this repo's `main` branch will redeploy to *every* tenant's Vercel
project at once — that's the trade-off called out in `PRD.md` §6.2 (fast
to ship a fix everywhere; no way to roll a change out to one tenant at a
time without moving to a branch-per-tenant setup, which isn't needed yet).

---

## 1. Prerequisites

- [ ] A Google account to create the new Firebase project under
- [ ] A Supabase account (free tier is fine to start)
- [ ] Access to the Vercel team/account this repo is deployed from
- [ ] The new agency's basic details on hand: business name, logo file,
      contact email/phone, bank account details if they'll use the
      UPI-QR payment feature

---

## 2. Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. Name it after the new tenant (e.g. `acme-travel-erp`). Google Analytics is optional — not used by this app.
3. Once created, enable these products from the left sidebar:
   - **Firestore Database** → Create database → **production mode** → pick a region close to the tenant.
   - **Authentication** → Get started → enable the **Email/Password** sign-in provider (that's the only one this app uses).
4. Skip **Storage** — this app doesn't use Firebase Storage (see `src/lib/storage/upload.ts`; it was blocked on the paid Blaze plan early on and every upload was migrated to Supabase instead). Don't activate Blaze for this.

### 2a. Deploy the security rules

This environment has no Firebase CLI session available to run `firebase
deploy` directly (no browser OAuth possible here, no service-account key
stored locally — same limitation noted in the original project's
`firestore.rules` deploys). Two ways to get the rules in:

- **Console paste (no setup needed):** open `firestore.rules` from this
  repo, copy the whole file, go to the new Firebase project → **Firestore
  Database → Rules tab**, paste over the default rules, click **Publish**.
- **Or, if you have the Firebase CLI installed on your own machine** (not
  this session): `firebase login`, `firebase use --add` to point at the
  new project, then `firebase deploy --only firestore:rules,firestore:indexes`
  — this also handles the indexes step below in one command, which the
  Console-paste method can't.

### 2b. Composite indexes

`firestore.indexes.json` in this repo defines 12 composite indexes the
app's queries depend on. Three options, in order of effort:

1. **Do nothing at first.** Firestore throws a `FAILED_PRECONDITION`
   error with a direct "create this index" link the first time a query
   that needs one actually runs. Click each link as it comes up during
   testing (step 8 below will surface most of them). Fine for a slow
   rollout; annoying if you want everything working on day one.
2. **CLI deploy** (see 2a) — `firebase deploy --only firestore:indexes`
   creates all 12 in one shot from the JSON file. Fastest if the CLI is
   available to you.
3. **Manual Console recreation** — open `firestore.indexes.json`,
   recreate each entry by hand under **Firestore → Indexes → Composite**.
   Tedious (~12 × 2 min) but works with zero tooling.

### 2c. Get the two credential sets you'll need later

- **Client config** (public, safe to ship in the browser bundle): Project
  Settings (gear icon) → **General** tab → scroll to "Your apps" → add a
  **Web app** → copy the `firebaseConfig` object it gives you. You'll map
  these values to the `NEXT_PUBLIC_FIREBASE_*` env vars in step 5.
- **Admin service account** (secret — never commit this anywhere):
  Project Settings → **Service accounts** tab → **Generate new private
  key**. This downloads a JSON file. You'll paste its *entire contents*
  as one env var (`FIREBASE_SERVICE_ACCOUNT_KEY`) in step 5 — most
  hosting platforms, Vercel included, accept a JSON string as an env var
  value directly.

---

## 3. Create the Supabase project (file storage)

1. Go to [supabase.com](https://supabase.com) → **New project**. Name it after the tenant, pick a region, set a database password (this app doesn't use Supabase's own database/auth, only its Storage product, but a project needs one).
2. Once created: **Storage** (left sidebar) → **New bucket** → name it exactly `app-uploads` (this exact name is hardcoded in a few server routes — see `src/app/api/storage/upload/route.ts`) → mark it **Public**. Every uploaded file (logos, QR codes, brochure PDFs, training certificates, etc.) is served from a public URL by design — nothing in this bucket is meant to be private.
3. **Project Settings → API**: copy the **Project URL** and the **service_role key** (not the anon key — server-side uploads use the elevated service-role key; there's no browser-facing Supabase client in this app by design, everything proxies through `/api/storage/upload`).

---

## 4. Create the Vercel project

1. In the Vercel dashboard, **Add New → Project**, import this same
   GitHub repository. Vercel allows a repo to back multiple projects, so
   the existing Wanago production project is untouched.
2. Give it a distinct project name (e.g. `acme-travel-erp`).
3. Framework preset should auto-detect **Next.js**. Leave build settings
   at their `vercel.json` defaults (this repo already declares the build
   command, cron jobs, and security headers — nothing extra to configure
   here).
4. **Don't deploy yet** — set the environment variables first (next
   step), otherwise the first build will fail or run against no backend.

---

## 5. Environment variables

Set these under the new Vercel project → **Settings → Environment
Variables** (Production, and Preview/Development too if you'll test
branches). Values marked *(from step 2c)* come from the Firebase web-app
config; *(from step 3)* from Supabase.

| Variable | Where it comes from | Notes |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | step 2c | |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | step 2c | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | step 2c | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | step 2c | Unused (no Firebase Storage) but the client SDK expects the field to be present |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | step 2c | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | step 2c | |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | step 2c | Paste the *entire downloaded JSON file* as the value |
| `NEXT_PUBLIC_SUPABASE_URL` | step 3 | |
| `SUPABASE_SERVICE_ROLE_KEY` | step 3 | Secret — server-only |
| `NEXT_PUBLIC_APP_URL` | the Vercel deployment's own URL, e.g. `https://acme-travel-erp.vercel.app` | Used for links/QR codes/emails — see `src/lib/app-url.ts`. **Must be the tenant's own URL**, not left blank (falls back to `localhost:3000` if unset, which would break every generated link in production) |
| `NEXT_PUBLIC_APP_NAME` | free text, e.g. `Acme Travel ERP` | Currently only read in `.env.local`'s own convention; most of the visible app name now comes from `settings/company.businessName` (step 8) instead |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API key | Powers every AI feature (drafts, assistant, digests). Free tier. |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys | Fallback AI provider when Gemini's free tier is exhausted. Free tier. |
| `CRON_SECRET` | make up any long random string yourself | Shared secret Vercel Cron sends back to authenticate the 6 scheduled jobs in `vercel.json` — same value has to be used consistently, it's not issued by anything external |

**Not needed as env vars** — email (Gmail/Resend), WhatsApp (Meta Cloud
API), and Google Cloud TTS are all configured *after* first login, via
**Admin → Integrations** in the app itself (Firestore-backed, see
`src/lib/get-integration-secret.ts`). No redeploy needed to turn those
on or change them later.

Once all of the above are set, trigger the first deploy (push to the
branch Vercel is tracking, or use **Deployments → Redeploy**).

---

## 6. Bootstrap the first Super Admin

There's no self-serve signup page in this app by design (every other
user is created by an existing admin via **Admin → Users**) — so the
very first account has to be created by hand, once, directly against
Firebase. After this one manual step, everything else happens through
the normal UI.

1. **Firebase Console → Authentication → Users → Add user.** Enter the
   owner's real email and a temporary password (they can reset it later
   from the login screen's "Forgot Password" link). Copy the **User UID**
   Firebase generates — you need it for the next step.
2. **Firestore Database → Data → Start collection** (if `users` doesn't
   exist yet) → collection ID `users` → **document ID: paste the UID from
   step 1** → add these fields exactly (matching the shape
   `createUserProfile()` writes in `src/modules/auth/services/auth.service.ts`):

   | Field | Type | Value |
   |---|---|---|
   | `uid` | string | the same UID |
   | `email` | string | the email from step 1 |
   | `displayName` | string | the owner's name |
   | `photoURL` | null | — |
   | `phone` | null | — |
   | `systemRole` | string | `super_admin` |
   | `teamRole` | string | any value from `src/types/rbac.ts`'s `TeamRole` — `"founder"` is the natural default for whoever's bootstrapping their own company's account |
   | `officeId` | string | `""` (leave empty — create a real Office after logging in, then edit this profile) |
   | `officeName` | string | `""` |
   | `department` | string | `""` |
   | `isActive` | boolean | `true` |
   | `createdBy` | string | the same UID (self-created) |
   | `status` | string | `active` |
   | `createdAt` | timestamp | now |
   | `updatedAt` | timestamp | now |
   | `lastLoginAt` | null | — |

3. Log in at `https://<the-new-vercel-url>/auth/login` with that email +
   temporary password. `super_admin` unlocks every page and permission,
   including Admin → Users, so every subsequent user gets created
   normally from here on.

---

## 7. First-login configuration

All done through the app UI now — no more manual Firestore edits.

1. **Admin → Settings → Company Settings.** Fill in Business Name,
   contact info, address, logo upload, GST/tax settings if applicable,
   bank details + UPI ID (if they'll use the QR-payment feature),
   quotation terms, **Website**, and **Social Handle**. This one doc is
   what every AI prompt, PDF, email, and page in the app now reads the
   tenant's name/branding from (Phase 1+2 of the de-hardcoding work) —
   nothing else needs editing for branding to be correct everywhere.
2. **Admin → Offices.** Create at least one office/branch — most of the
   app (employees, leads, bookings) is scoped to an office.
3. Go back to the bootstrap user's own profile (**Admin → Users**) and
   fill in `officeId`/`officeName`/`department` now that an office exists.
4. **Admin → Integrations.** Set up email (Gmail SMTP app password is the
   simpler of the two options — see the in-app description) so
   notifications and quotation/invoice emails can actually send. WhatsApp
   and TTS are optional, add later if/when needed.

---

## 8. Verify

- [ ] Log in as the bootstrap Super Admin — dashboard loads, sidebar
      shows the tenant's own logo/name, not Wanago's
- [ ] Create a second user via Admin → Users — confirms Auth + Firestore
      write path works end to end
- [ ] Create a Lead, convert it to a Quotation, download the PDF — should
      show the tenant's logo, business name, website, and (if uploaded)
      payment QR — not any Wanago default
- [ ] Trigger one notification email (e.g. approve an ESS leave request)
      — subject/from-name/footer should say the tenant's name
- [ ] Visit `/manifest.webmanifest` on the new deployment directly — name/
      short_name/description should reflect the tenant, not "Wanago"
- [ ] Open the public, no-login pages once real data exists — quick
      inquiry form, a booking link, a referral link — confirm the logo
      alt/footer text matches the tenant (these read from
      `/api/public/branding`, see `PRD.md`'s de-hardcoding notes)
- [ ] Watch the Vercel function logs for a day for `FAILED_PRECONDITION`
      Firestore errors (missing composite index) if you went with option
      1 in step 2b

---

## 9. What's still manual (not scripted)

Everything above is a checklist, not a script — there is no
`provision-tenant.sh` or Terraform/Pulumi config that does this
automatically (flagged as a known gap in `PRD.md` §6.1). Worth building
once there are enough real tenants that repeating this by hand becomes
the bottleneck, not before. Also still missing, independent of this
runbook (see `PRD.md` §6.3): a real pricing/billing model, a self-serve
signup flow, and a tenant-facing Terms of Service / Privacy Policy — none
of which block a single hand-onboarded pilot customer, but all of which
block this being sold at any real scale.
