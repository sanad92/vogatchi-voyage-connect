import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

/**
 * Core-module smoke tests
 * Each page must:
 *  - Load without being redirected to /login
 *  - Not display an error boundary ("Something went wrong")
 *  - Not produce uncaught JS console errors
 */

const CORE_ROUTES = [
  "/customers",
  "/invoices",
  "/reports",
  "/bank-accounts",
  "/expense-management",
  "/hotel-bookings",
  "/flight-bookings",
  "/transport-bookings",
  "/car-rentals",
  "/whatsapp",
];

/**
 * Console error patterns that are known to be benign in this stack.
 * Add entries here to suppress false positives without hiding real bugs.
 */
const BENIGN_ERROR_PATTERNS = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed",
  "favicon",
  "net::ERR_ABORTED",
  // Supabase realtime connection noise in CI
  "WebSocket connection to",
];

function isBenign(msg: string): boolean {
  return BENIGN_ERROR_PATTERNS.some((p) => msg.includes(p));
}

test.describe("Core module smoke checks", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  for (const route of CORE_ROUTES) {
    test(`${route} loads without JS errors or crash`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && !isBenign(msg.text())) {
          consoleErrors.push(msg.text());
        }
      });

      const failedRequests: string[] = [];
      page.on("response", (resp) => {
        const status = resp.status();
        const url = resp.url();
        // Only flag non-Supabase document/API 4xx-5xx errors
        if (
          status >= 400 &&
          status < 600 &&
          !url.includes("supabase.co") &&
          !url.includes("supabase.in")
        ) {
          failedRequests.push(`${status} ${url}`);
        }
      });

      await page.goto(route);
      await page.waitForLoadState("networkidle", { timeout: 30_000 });

      // Should not bounce back to login
      await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

      // Should not show error boundary
      await expect(
        page.locator("text=Something went wrong").first()
      ).not.toBeVisible({ timeout: 5_000 });

      expect(
        consoleErrors,
        `Uncaught JS errors on ${route}:\n${consoleErrors.join("\n")}`
      ).toHaveLength(0);
    });
  }
});
