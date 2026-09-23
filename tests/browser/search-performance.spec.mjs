import { test, expect } from "@playwright/test";
test("viewport highlights, scrolling count and stale-query replacement", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.locator("#project-search");
  await expect(input).toBeVisible();
  const listButton = page.locator("[data-view=list]");
  if (await listButton.isVisible()) await listButton.click();
  await input.fill("screening");
  const first = page.locator("article.program:not([hidden])").first();
  await first.scrollIntoViewIfNeeded();
  await expect(first.locator("mark.search-match").first()).toBeVisible();
  const panel = page.locator(".evidence-scroll").filter({ has: first });
  await panel.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.locator(".more-projects-hint:visible").first()).toHaveText(
    "No more projects to scroll",
  );
  const last = page.locator("article.program:not([hidden])").last();
  await last.scrollIntoViewIfNeeded();
  await expect(last.locator("mark.search-match").first()).toBeVisible();
  await input.fill("umami");
  await expect(page.locator("article.program:not([hidden])")).toHaveCount(0);
  await input.fill("colposcopy");
  await page
    .locator("article.program:not([hidden])")
    .first()
    .scrollIntoViewIfNeeded();
  await expect(
    page.locator("article.program:not([hidden]) mark.search-match").first(),
  ).toContainText(/colposcopy/i);
  await input.fill("");
  await expect(
    page
      .locator(".section-heading h2")
      .filter({ hasText: /^All \d+ Projects$/ }),
  ).toBeVisible();
  await expect(
    page
      .locator("article.program:not([hidden])")
      .first()
      .locator("mark.search-match"),
  ).toHaveCount(0);
});
