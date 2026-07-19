import { defineConfig, devices } from "@playwright/test";

// Smoke suite for the money paths listed in the ERP 3.0 PRD (Pillar 1,
// "Testing & CI/CD"). Runs against a production build (`next start`, not
// `next dev`) so it matches what actually ships. See e2e/README.md for
// which of the 12 flows are wired up vs. still scaffolded — the
// authenticated ones need a real (non-demo, per PROJECT_RULES.md) test
// account, so they're gated behind TEST_USER_EMAIL/TEST_USER_PASSWORD.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
