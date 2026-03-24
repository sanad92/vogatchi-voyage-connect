import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

/**
 * Subscription & onboarding redirect smoke-check
 *
 * After login the super admin must land on a recognisable page and NOT see:
 *  - A crash / error-boundary
 *  - A redirect loop back to /login
 */

test.describe("Subscription & onboarding redirect", () => {
  test("after login, user lands on a valid page (not a crash or redirect loop)", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await loginAsTestUser(page);
    // Give the app time to settle (subscription guard, onboarding guard, etc.)
    await page.waitForLoadState("networkidle", { timeout: 30_000 });

    const url = page.url();

    // Must not be stuck on /login
    expect(url).not.toMatch(/\/login/);

    // Must not show a crash boundary
    await expect(
      page.locator("text=Something went wrong").first()
    ).not.toBeVisible({ timeout: 5_000 });

    // The landing path should be one of the expected destinations
    const validLandingPaths = [
      "/dashboard",
      "/onboarding",
      "/register-organization",
      "/create-organization",
      "/subscription",
      "/subscription-expired",
      "/platform-admin",
    ];
    const onValidPage = validLandingPaths.some((p) => url.includes(p));
    expect(
      onValidPage,
      `Unexpected landing URL after login: ${url}`
    ).toBe(true);

    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("ResizeObserver") &&
        !e.includes("favicon") &&
        !e.includes("net::ERR_ABORTED") &&
        !e.includes("WebSocket connection to")
    );
    expect(
      criticalErrors,
      `Console errors after login redirect: ${criticalErrors.join("\n")}`
    ).toHaveLength(0);
  });
});
