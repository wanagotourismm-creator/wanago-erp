import { test, expect } from "@playwright/test";

// One of the PRD's 12 "money path" smoke flows (PRD Pillar 1, "Testing &
// CI/CD"). Doesn't submit real credentials — see e2e/README.md for why the
// authenticated flows are gated behind a TEST_USER_EMAIL/TEST_USER_PASSWORD
// fixture instead of being wired up directly here.
test.describe("Login", () => {
  test("renders the sign-in form", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page).toHaveTitle(/Sign In/);
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows a client-side validation error on empty submit", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.locator("text=/required|invalid/i").first()).toBeVisible();
  });

  test("rejects an invalid credential without crashing", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder("you@company.com").fill("no-such-user@example.com");
    await page.getByPlaceholder("••••••••").fill("wrong-password-123");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Real Firebase Auth call against the actual project — asserts the app
    // surfaces the rejection gracefully, not that any particular account
    // exists. No data is created or mutated by a failed sign-in.
    await expect(page.locator("text=/invalid|incorrect|not found|error/i").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
