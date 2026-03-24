import { test, expect } from "@playwright/test";
import { createFreshOnboardedUser } from "./helpers/auth";

test.describe("Release smoke", () => {
  test("signup -> create organization -> dashboard", async ({ page }) => {
    await createFreshOnboardedUser(page);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(
      page.locator("text=Something went wrong").first()
    ).not.toBeVisible();
  });
});
