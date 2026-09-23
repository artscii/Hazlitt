import { test, expect } from "@playwright/test";
test("Admin workspaces preserve drafts and separate search settings", async ({
  page,
}) => {
  await page.goto("/admin");
  await page
    .locator("#admin-login input")
    .fill(process.env.ATLAS_TEST_PASSWORD);
  await page.getByRole("button", { name: "Unlock editor" }).click();
  await expect(page.locator("#admin-editor")).toBeVisible();
  await page.locator("#admin-project-search").fill("1");
  await expect(page.locator("#edit-record-reference")).toHaveValue(
    /Project 01/,
  );
  const name = page.locator("[name=name]");
  const original = await name.inputValue();
  await name.fill(original + " draft");
  const navigate = async (key) => {
    if (await page.locator(".workspace-mobile").isVisible())
      await page.locator(".workspace-mobile").selectOption(key);
    else await page.locator(`[data-workspace=${key}]`).click();
  };
  await navigate("search");
  await expect(page.locator("#search-fieldset")).toBeVisible();
  await expect(page.locator(".thesaurus-editor")).toBeVisible();
  await page.locator("#config-qmd-enabled").uncheck();
  await page.getByRole("button", { name: "Save search settings" }).click();
  await expect(
    page.getByText("Search settings saved.", { exact: false }),
  ).toBeVisible();
  await navigate("projects");
  await expect(name).toHaveValue(original + " draft");
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }).first(),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
