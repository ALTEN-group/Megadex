import { expect, test } from "@playwright/test";
import { loginAs, openEntity } from "./helpers/auth";

test.describe("Social networks CRUD", () => {
  test("creates a social network then archives it", async ({ page }) => {
    test.setTimeout(90_000);
    const name = `e2e-social-${Date.now()}`;

    await loginAs(page);
    await openEntity(page, "socials");
    await expect(page.locator("#table-toolbar .toolbar-title")).toHaveText(
      "Social networks",
    );

    await page.locator("#table-toolbar button .pi-plus").click();
    const createDialog = page.getByRole("dialog").filter({
      has: page.getByRole("heading", { name: "Create - Social network" }),
    });
    await expect(createDialog).toBeVisible();

    await createDialog.getByRole("textbox").first().fill(name);
    await createDialog.getByRole("textbox").nth(1).fill("https://example.com");
    // The dialog model is fed by a 300ms-debounced valueChanges stream: submitting
    // sooner posts the previous value.
    await page.waitForTimeout(500);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        /\/megadex\/socials\/?$/.test(new URL(response.url()).pathname) &&
        response.request().method() === "POST",
    );
    await createDialog.getByRole("button", { name: "Submit" }).click();
    const createResponse = await createResponsePromise;
    expect(
      createResponse.ok(),
      `Create failed with HTTP ${createResponse.status()} for ${createResponse.request().postData()}: ${await createResponse.text()}`,
    ).toBeTruthy();
    await expect(createDialog).toBeHidden();
    await page.getByRole("button", { name: "Refresh data" }).click();

    const nameCell = page.getByRole("cell", { name });
    await expect(nameCell).toBeVisible({ timeout: 15_000 });
    await nameCell.click();

    const editDialog = page.getByRole("dialog").filter({
      has: page.getByRole("heading", { name: "Edit - Social network" }),
    });
    await editDialog.getByRole("button", { name: "Archive" }).click();
    const confirm = page.getByRole("dialog").filter({
      hasText: /archive this view/i,
    });
    await expect(confirm).toBeVisible();

    const archiveResponsePromise = page.waitForResponse(
      (response) =>
        /\/megadex\/socials\/archive\/?$/.test(
          new URL(response.url()).pathname,
        ) && response.request().method() === "POST",
    );
    await confirm.getByRole("button", { name: "Confirm" }).click();
    const archiveResponse = await archiveResponsePromise;
    expect(
      archiveResponse.ok(),
      `Archive failed with HTTP ${archiveResponse.status()} at ${archiveResponse.url()} for ${archiveResponse.request().postData()}: ${await archiveResponse.text()}`,
    ).toBeTruthy();

    // Archived rows stay listed (greyed out), so reopen the row instead:
    // an archived social network no longer offers the "Archive" action.
    await page.getByRole("button", { name: "Refresh data" }).click();
    const archivedCell = page.getByRole("cell", { name });
    await expect(archivedCell).toBeVisible({ timeout: 15_000 });
    await archivedCell.click();

    await expect(editDialog).toBeVisible();
    await expect(
      editDialog.getByRole("button", { name: "Archive" }),
    ).toHaveCount(0);
  });
});
