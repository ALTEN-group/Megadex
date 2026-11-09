import { expect, type Page, test } from "@playwright/test";
import { loginAs, openEntity } from "../../e2e/helpers/auth";
import { Director } from "../support/director";

const SOCIAL = "GitHub";
const SEED_URL = "https://www.github.com";
const EDITED_URL = "https://github.com/ALTEN-group";

const editDialog = (page: Page) =>
  page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: "Edit - Social network" }),
  });

const waitForUpdate = (page: Page) =>
  page.waitForResponse(
    (response) =>
      /\/megadex\/socials/.test(new URL(response.url()).pathname) &&
      ["PUT", "PATCH"].includes(response.request().method()),
  );

/** Puts the seeded URL back off camera, so the scenario can be filmed again. */
async function resetSocial(page: Page): Promise<void> {
  await page.getByRole("cell", { name: SOCIAL, exact: true }).click();
  const dialog = editDialog(page);
  const urlInput = dialog.getByRole("textbox").nth(1);
  await expect(urlInput).toBeVisible();
  if ((await urlInput.inputValue()) === SEED_URL) {
    await dialog.getByRole("button", { name: "Cancel" }).click();
  } else {
    await urlInput.fill(SEED_URL);
    await page.waitForTimeout(500);
    const update = waitForUpdate(page);
    await dialog.getByRole("button", { name: "Submit" }).click();
    expect((await update).ok()).toBeTruthy();
    await page.getByRole("button", { name: "Refresh data" }).click();
  }
  await expect(dialog).toBeHidden();
}

test("edit a social network", async ({ context, page }) => {
  const director = await Director.on(context, page);
  await loginAs(page);
  await openEntity(page, "socials");
  await resetSocial(page);
  await director.action();
  await director.pause(1000);

  const row = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: SOCIAL, exact: true }),
  });
  await director.hover(row);
  await director.pause(600);
  await director.click(
    row.getByRole("cell", { name: SOCIAL, exact: true }),
    1200,
  );

  const dialog = editDialog(page);
  const urlInput = dialog.getByRole("textbox").nth(1);
  await expect(urlInput).toHaveValue(SEED_URL);
  await director.type(urlInput, EDITED_URL, 800);

  const update = waitForUpdate(page);
  await director.click(dialog.getByRole("button", { name: "Submit" }), 0);
  expect((await update).ok()).toBeTruthy();
  await expect(dialog).toBeHidden();
  await director.click(page.getByRole("button", { name: "Refresh data" }), 0);
  await expect(
    row.getByRole("cell", { name: EDITED_URL, exact: true }),
  ).toBeVisible();
  await director.pause(600);
  await director.hover(
    row.getByRole("cell", { name: EDITED_URL, exact: true }),
  );
  await director.pause(2500);

  await director.save("admin-edit-form");
});
