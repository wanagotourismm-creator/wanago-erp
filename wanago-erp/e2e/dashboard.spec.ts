import { test, expect } from "./fixtures/auth";

// Read-only authenticated smoke checks — safe to run against the real
// Firebase project in CI since nothing here creates or mutates data.
test.describe("Dashboard (authenticated, read-only)", () => {
  test("loads the dashboard after login", async ({ authedPage }) => {
    await expect(authedPage).toHaveURL(/dashboard/);
    await expect(authedPage.locator("body")).not.toContainText("Something went wrong");
  });

  test("global search opens via keyboard shortcut", async ({ authedPage }) => {
    await authedPage.keyboard.press("Control+K");
    await expect(authedPage.getByPlaceholder(/search/i).first()).toBeVisible();
  });
});
