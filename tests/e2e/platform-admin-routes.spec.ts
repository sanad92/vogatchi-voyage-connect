import { test, expect } from "@playwright/test";
import { loginAsSuperAdmin } from "./helpers/auth";

/**
 * Platform-admin route tests (PlatformAdminGuard)
 * Routes: /platform-admin, /platform-admin/organizations,
 *         /platform-admin/subscriptions, /database-manager
 */

const PLATFORM_ADMIN_ROUTES = [
  { path: "/platform-admin", label: "Platform Admin Dashboard" },
  {
    path: "/platform-admin/organizations",
    label: "Platform Admin Organizations",
  },
  {
    path: "/platform-admin/subscriptions",
    label: "Platform Admin Subscriptions",
  },
  { path: "/database-manager", label: "Database Manager" },
];

test.describe("Platform-admin routes (PlatformAdminGuard)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  for (const { path, label } of PLATFORM_ADMIN_ROUTES) {
    test(`super admin can access ${label} (${path})`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto(path);
      await page.waitForLoadState("networkidle", { timeout: 30_000 });

      // Must not be redirected to login
      await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

      // Must not show an error boundary
      await expect(
        page.locator("text=Something went wrong").first()
      ).not.toBeVisible();

      // Must not show an access-denied message
      await expect(page.locator("text=Access denied").first()).not.toBeVisible();
      await expect(page.locator("text=Unauthorized").first()).not.toBeVisible();
      await expect(page.locator("text=403").first()).not.toBeVisible();

      const criticalErrors = consoleErrors.filter(
        (e) =>
          !e.includes("ResizeObserver") &&
          !e.includes("favicon") &&
          !e.includes("net::ERR_ABORTED")
      );
      expect(
        criticalErrors,
        `Console errors on ${path}: ${criticalErrors.join("\n")}`
      ).toHaveLength(0);
    });
  }
});
