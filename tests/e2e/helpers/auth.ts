import { Page } from "@playwright/test";

/**
 * Returns the credentials from environment variables.
 * Falls back to provided defaults only for local dev convenience;
 * in CI these MUST be set via secrets.
 */
export function getCredentials() {
  const email = process.env.E2E_SUPER_ADMIN_EMAIL;
  const password = process.env.E2E_SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "E2E_SUPER_ADMIN_EMAIL and E2E_SUPER_ADMIN_PASSWORD must be set. " +
        "Copy .env.e2e.example to .env.e2e and fill in the values."
    );
  }
  return { email, password };
}

/**
 * Performs login via the UI and waits until the app navigates away from /login.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");
  await page.waitForSelector('input[type="email"], input[name="email"]', {
    timeout: 15_000,
  });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill(
    'input[type="password"], input[name="password"]',
    password
  );
  await page.click('button[type="submit"]');
  // Wait until we leave /login (redirect to dashboard or onboarding)
  await page.waitForFunction(
    () => !window.location.pathname.startsWith("/login"),
    { timeout: 30_000 }
  );
}

/**
 * Convenience wrapper: log in as the super admin defined in env vars.
 */
export async function loginAsSuperAdmin(page: Page): Promise<void> {
  const { email, password } = getCredentials();
  await loginAs(page, email, password);
}
