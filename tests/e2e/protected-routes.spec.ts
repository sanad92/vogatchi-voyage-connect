import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

/**
 * Protected-route tests
 * - /dashboard requires authentication
 * - After login the super admin can reach /dashboard
 */

test.describe("Protected routes", () => {
  test("accessing /dashboard without auth redirects to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });

  test("authenticated user can access /dashboard after login", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/dashboard");

    // Allow possible intermediate redirects (onboarding, subscription, etc.)
    // The page must NOT redirect back to /login
    await page.waitForLoadState("networkidle", { timeout: 30_000 });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Should not display an error boundary
    await expect(
      page.locator("text=Something went wrong").first()
    ).not.toBeVisible();
  });
});
