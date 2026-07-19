# E2E smoke suite

Covers the 12 "money path" flows from the ERP 3.0 PRD (Pillar 1, 3.2).

## Wired up and running today

- `login.spec.ts` — sign-in form renders, client validation, invalid-credential
  rejection. Runs against the real Firebase Auth project; asserts behavior,
  not that a specific account exists.
- `dashboard.spec.ts` — read-only authenticated checks (dashboard loads,
  global search opens). Requires `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`
  for a real account; skips itself if unset.

## Scaffolded but not runnable yet (`money-paths.spec.ts`)

The other 10 flows all create or mutate a record (lead, invoice, payroll
run, WhatsApp message...). `PROJECT_RULES.md` bans demo/mock/seed data
project-wide, so there's no throwaway tenant to run these against — every
CI run would leave real-looking junk in the production Firestore.

Pick one before filling these in:

1. **Dedicated staging Firebase project** mirroring prod's rules/schema.
   Point `PLAYWRIGHT_BASE_URL` and a staging `TEST_USER_*` at it.
2. **Tagged + auto-cleaned test data in prod** — e.g. every CI-created
   record gets `officeId: "e2e-test"`, and a cleanup step deletes anything
   with that tag after the run.

## Running locally

```
npm run test:e2e            # unauthenticated + fixme-skipped
TEST_USER_EMAIL=... TEST_USER_PASSWORD=... npm run test:e2e   # + authenticated
```
