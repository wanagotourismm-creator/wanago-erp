import { test } from "./fixtures/auth";

// The remaining money-path flows from the PRD's 12 (Pillar 1, "Testing &
// CI/CD"). Each of these *creates or mutates* a record (a lead, an
// invoice, a payroll run, an outbound WhatsApp message...) — running them
// against the real production Firestore on every CI push would leave
// real-looking junk data behind, which PROJECT_RULES.md's "no demo data /
// no seed data" rule exists specifically to prevent.
//
// Unblock these once one of the following exists:
//   1. A dedicated staging Firebase project mirroring prod rules/schema
//      (point PLAYWRIGHT_BASE_URL + a staging TEST_USER_* at it), or
//   2. A convention for tagging CI-created records (e.g. officeId
//      "e2e-test") plus a cleanup step that purges them after the run.
// Until then these stay test.fixme so the gap shows up in every test
// report instead of silently missing from the suite.
test.describe("Money paths — pending a safe-to-mutate environment", () => {
  test.fixme("create lead", async () => {});
  test.fixme("quotation to booking conversion", async () => {});
  test.fixme("invoice create + PDF", async () => {});
  test.fixme("expense approval", async () => {});
  test.fixme("attendance punch", async () => {});
  test.fixme("leave apply/approve", async () => {});
  test.fixme("payroll run", async () => {});
  test.fixme("WhatsApp send", async () => {});
  test.fixme("report export", async () => {});
  test.fixme("portal view", async () => {});
});
