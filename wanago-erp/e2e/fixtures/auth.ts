import { test as base, expect } from "@playwright/test";

// Authenticated-flow fixture. Deliberately requires a *real* account via
// env vars rather than a seeded/mock user — PROJECT_RULES.md bans demo
// data, mock users, and seed data project-wide, so there's no "test
// tenant" to log into. Provision one real, low-privilege staff account
// for CI (ideally in a dedicated staging Firebase project — see
// e2e/README.md) and set its credentials as repo/CI secrets.
export const test = base.extend<{ authedPage: import("@playwright/test").Page }>({
  authedPage: async ({ page }, use) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!email || !password, "TEST_USER_EMAIL/TEST_USER_PASSWORD not set — see e2e/README.md");

    await page.goto("/auth/login");
    await page.getByPlaceholder("you@company.com").fill(email!);
    await page.getByPlaceholder("••••••••").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 15_000 });

    await use(page);
  },
});

export { expect };
