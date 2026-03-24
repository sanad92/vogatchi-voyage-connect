import { expect, Page } from "@playwright/test";

type Credentials = {
  email: string;
  password: string;
};

let generatedUserCredentials: Credentials | null = null;
let configuredCredentialsRejected = false;

function getConfiguredCredentialsOrNull(): Credentials | null {
  const email = process.env.E2E_SUPER_ADMIN_EMAIL?.trim();
  const password = process.env.E2E_SUPER_ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

/**
 * Returns the credentials from environment variables.
 * Falls back to provided defaults only for local dev convenience;
 * in CI these MUST be set via secrets.
 */
export function getCredentials() {
  const credentials = getConfiguredCredentialsOrNull();
  if (!credentials) {
    throw new Error(
      "E2E_SUPER_ADMIN_EMAIL and E2E_SUPER_ADMIN_PASSWORD must be set. " +
        "Copy .env.e2e.example to .env.e2e and fill in the values."
    );
  }
  return credentials;
}

async function submitAuthForm(page: Page, email: string, password: string) {
  await page.waitForSelector('input[type="email"], input[name="email"]', {
    timeout: 15_000,
  });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
}

async function clickButtonByExactText(page: Page, text: string) {
  const buttons = page.locator("button");
  const count = await buttons.count();

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const label = (await button.textContent())?.trim();

    if (label === text && (await button.isVisible().catch(() => false))) {
      await button.click();
      return true;
    }
  }

  return false;
}

async function tryLogin(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto("/login");
  await submitAuthForm(page, email, password);

  try {
    await page.waitForFunction(
      () => !window.location.pathname.startsWith("/login"),
      { timeout: 20_000 }
    );
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

async function finishOrganizationSetup(page: Page, email: string) {
  await page.waitForURL(/\/register-organization|\/create-organization|\/onboarding|\/dashboard/, {
    timeout: 30_000,
  });

  if (/\/register-organization|\/create-organization/.test(page.url())) {
    const uniqueSuffix = Date.now().toString().slice(-6);

    await page.fill("#org-name", `Release Org ${uniqueSuffix}`);
    await page.fill("#org-phone", "01012345678");
    await page.fill("#org-email", email);
    await page.fill("#org-address", "Cairo");
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/onboarding|\/dashboard/, { timeout: 30_000 });
  }

  if (page.url().includes("/onboarding")) {
    await page.waitForTimeout(2_000);

    const clickedSkipAll = await clickButtonByExactText(page, "تخطي الكل");
    if (!clickedSkipAll) {
      throw new Error("Could not find the onboarding 'skip all' button.");
    }

    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  }

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
}

export async function createFreshOnboardedUser(page: Page): Promise<Credentials> {
  const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `release-smoke+${uniqueSuffix}@example.com`;
  const password = `Release!${uniqueSuffix}`;
  const fullName = `Release Smoke ${uniqueSuffix.slice(-6)}`;

  await page.goto("/signup");
  await page.fill("#signup-fullname", fullName);
  await page.fill("#signup-email", email);
  await page.fill("#signup-password", password);
  await page.click('button[type="submit"]');

  await page.waitForFunction(
    () => !window.location.pathname.startsWith("/signup"),
    { timeout: 30_000 }
  );

  await finishOrganizationSetup(page, email);

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
  const success = await tryLogin(page, email, password);
  if (!success) {
    throw new Error(`Failed to sign in with ${email}.`);
  }
}

/**
 * Logs in with configured credentials when valid, otherwise provisions a
 * dedicated smoke-test user and finishes organization onboarding once.
 */
export async function loginAsTestUser(page: Page): Promise<Credentials> {
  if (!configuredCredentialsRejected) {
    const configuredCredentials = getConfiguredCredentialsOrNull();
    if (configuredCredentials) {
      const success = await tryLogin(
        page,
        configuredCredentials.email,
        configuredCredentials.password
      );
      if (success) {
        return configuredCredentials;
      }

      configuredCredentialsRejected = true;
    }
  }

  if (generatedUserCredentials) {
    await loginAs(
      page,
      generatedUserCredentials.email,
      generatedUserCredentials.password
    );
    return generatedUserCredentials;
  }

  generatedUserCredentials = await createFreshOnboardedUser(page);
  return generatedUserCredentials;
}

/**
 * Convenience wrapper: log in as the super admin defined in env vars.
 */
export async function loginAsSuperAdmin(page: Page): Promise<void> {
  const { email, password } = getCredentials();
  await loginAs(page, email, password);
}
