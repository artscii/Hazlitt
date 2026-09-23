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
  await navigate("system");
  await expect(page.locator("[data-graph] svg")).toBeVisible();
  for (const id of ["search", "editing", "transfers", "settings", "code"]) {
    await page.locator("[data-diagram]").selectOption(id);
    await expect(page.locator("[data-graph]")).toHaveAttribute(
      "data-rendered",
      id,
    );
    await expect(page.locator("[data-graph] svg")).toBeVisible();
    await expect(page.getByText("Diagram could not be rendered.")).toHaveCount(
      0,
    );
  }
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

test("VIA/acetic vocabulary survives editor reload and reaches public search", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await page
    .locator("#admin-login input")
    .fill(process.env.ATLAS_TEST_PASSWORD);
  await page.getByRole("button", { name: "Unlock editor" }).click();
  await expect(page.locator("#admin-editor")).toBeVisible();
  const search = async () => {
    if (await page.locator(".workspace-mobile").isVisible())
      await page.locator(".workspace-mobile").selectOption("search");
    else await page.locator("[data-workspace=search]").click();
  };
  await search();
  const via = page
    .locator(".thesaurus-row")
    .filter({ has: page.locator("[data-summary-term]", { hasText: /^via$/ }) });
  await via.locator("summary").click();
  const aliases = via.locator("[data-equivalents]");
  if (!(await aliases.inputValue()).includes("acetic;")) {
    const existing = await aliases.inputValue();
    // Keep the full phrase; add an exact single-word search alias once.
    if (
      !existing
        .split(";")
        .map((x) => x.trim())
        .includes("acetic")
    )
      await aliases.fill(existing + "; acetic");
  }
  if (await page.locator("[data-save]").isEnabled()) {
    await expect(page.locator("[data-draft-status]")).toContainText(
      "Unsaved vocabulary",
    );
    await page.locator("[data-save]").click();
    await expect(page.locator(".thesaurus-editor [data-status]")).toContainText(
      "Saved vocabulary",
    );
  }
  await page.reload();
  await expect(page.locator("#admin-editor")).toBeVisible();
  await search();
  await via.locator("summary").click();
  await expect(aliases).toHaveValue(/; acetic$/);
  const catalog = await (await request.get("/api/catalog?compact=1")).json();
  expect(
    catalog.thesaurus.entries.find((e) => e.term === "via").equivalents,
  ).toContain("acetic");
});
