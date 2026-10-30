import { expect, test } from "@playwright/test";
import { loginAs, logout } from "./helpers/auth";
import { hasAdminCredentials } from "./helpers/credentials";

test.describe("Auth shell", () => {
  test("redirects unauthenticated users from a protected route to login", async ({
    page,
  }) => {
    await page.goto("home");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Connexion")).toBeVisible();
  });

  test("logs out from the user menu and returns to login", async ({ page }) => {
    test.skip(!hasAdminCredentials(), "E2E_PASSWORD not set");
    await loginAs(page);
    await expect(page).toHaveURL(/\/home/);

    await logout(page);
    await expect(page.getByText("Connexion")).toBeVisible();

    await page.goto("home");
    await expect(page).toHaveURL(/\/login/);
  });
});
