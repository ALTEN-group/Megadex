import { expect, test } from "@playwright/test";
import { loginAs, openEntity } from "./helpers/auth";
import { hasAdminCredentials } from "./helpers/credentials";

const TABLE_PAGES = [
  { path: "users", title: "Users" },
  { path: "socials", title: "Social networks" },
] as const;

test.describe("Authenticated navigation", () => {
  test("entity pages and not-found load", async ({ page }) => {
    test.skip(!hasAdminCredentials(), "E2E_PASSWORD not set");
    await loginAs(page);

    for (const { path, title } of TABLE_PAGES) {
      await openEntity(page, path);
      await expect(page.locator("#table-toolbar .toolbar-title")).toHaveText(
        title,
      );
      await expect(page.locator("table tbody tr").first()).toBeVisible();
    }

    await page.goto("this-route-does-not-exist");
    await expect(page).toHaveURL(/\/not-found/);
    await expect(page.getByText("Not Found")).toBeVisible();
  });
});
