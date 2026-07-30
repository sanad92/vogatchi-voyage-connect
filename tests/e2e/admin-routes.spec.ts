import { test, expect } from "@playwright/test";
import { loginAsSuperAdmin } from "./helpers/auth";

/**
 * Admin-route tests (AdminRouteGuard)
 * Routes: /admin-settings, /monitoring, /admin/cms
 */

const ADMIN_ROUTES = [
  { path: "/admin-settings", label: "Admin Settings" },
  { path: "/monitoring", label: "Monitoring" },
  { path: "/admin/cms", label: "CMS Pages" },
];

test.describe("Admin routes (AdminRouteGuard)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  for (const { path, label } of ADMIN_ROUTES) {
    test(`super admin can access ${label} (${path})`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      const failedRequests: string[] = [];
      page.on("response", (resp) => {
        const status = resp.status();
        const url = resp.url();
        if (status >= 400 && status < 600 && !url.includes("supabase")) {
          failedRequests.push(`${status} ${url}`);
        }
      });

      await page.goto(path);
      await page.waitForLoadState("networkidle", { timeout: 30_000 });

      // Must not be bounced back to login
      await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

      // Must not show an error boundary
      await expect(
        page.locator("text=Something went wrong").first()
      ).not.toBeVisible();

      // Must not show an access-denied / 403 message
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
