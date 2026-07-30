import { test, expect } from "@playwright/test";
import { loginAsSuperAdmin } from "./helpers/auth";

/**
 * Authentication tests
 * - Unauthenticated access to a protected route redirects to /login
 * - Valid credentials allow login and land on a valid page
 */

test.describe("Authentication", () => {
  test("unauthenticated user visiting /dashboard is redirected to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });

  test("login page renders email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.locator('input[type="email"], input[name="email"]').first()
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('input[type="password"], input[name="password"]').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("super admin can log in and land on a valid page (not crash page)", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await loginAsSuperAdmin(page);

    // After login we should NOT be on /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // The page should not show a JS crash / "Something went wrong" boundary
    await expect(
      page.locator("text=Something went wrong").first()
    ).not.toBeVisible();

    // Filter out known benign Supabase/network noise
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("ResizeObserver") &&
        !e.includes("favicon") &&
        !e.includes("net::ERR_ABORTED")
    );
    expect(criticalErrors, `Console errors after login: ${criticalErrors.join("\n")}`).toHaveLength(0);
  });
});
