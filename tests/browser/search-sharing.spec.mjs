import { test, expect } from "@playwright/test";
test("shared search restores query, profiles, map and survives reload", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.copiedSearch = text;
        },
      },
    }),
  );
  await page.goto("/");
  const input = page.locator("#project-search");
  await expect(input).toHaveValue("Africa");
  await input.fill("country:Kenya");
  await expect(page.locator("article.program:not([hidden])")).toHaveCount(1);
  await page.locator("#share-search").click();
  await expect(page.locator("#share-search-status")).toHaveText("Link copied");
  const url = await page.evaluate(() => window.copiedSearch);
  expect(new URL(url).searchParams.get("q")).toBe("country:Kenya");
  await page.goto(url);
  await expect(input).toHaveValue("country:Kenya");
  await expect(page.locator("article.program:not([hidden])")).toHaveCount(1);
  await expect(page.locator("article.program:not([hidden])")).toHaveAttribute(
    "id",
    "kinondo",
  );
  await expect(
    page.locator(".marker:not([hidden]):not(.continent-hidden)"),
  ).toHaveCount(1);
  await page.reload();
  await expect(input).toHaveValue("country:Kenya");
  await expect(page.locator("article.program:not([hidden])")).toHaveCount(1);
  await input.fill("umami");
  await expect(page.locator("article.program:not([hidden])")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("search")).toBe(false);
  await page.locator("#share-search").click();
  await expect(page.locator("#share-search-status")).toHaveText("Link copied");
  await page.goto(await page.evaluate(() => window.copiedSearch));
  await expect(input).toHaveValue("umami");
  await expect(page.locator("article.program:not([hidden])")).toHaveCount(0);
});
test("shared location subset and manual clipboard fallback", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/search/share", {
    headers: { Origin: "http://127.0.0.1:8132" },
    data: { query: "Tanzania", ids: ["bombo"], filterIds: ["bombo"] },
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw Error("denied");
        },
      },
    }),
  );
  await page.goto(data.url);
  await expect(page.locator("#project-search")).toHaveValue("Tanzania");
  await expect(page.locator("article.program:not([hidden])")).toHaveCount(1);
  await expect(page.locator("article.program:not([hidden])")).toHaveAttribute(
    "id",
    "bombo",
  );
  await page.locator("#share-search").click();
  await expect(
    page.getByRole("textbox", { name: "Search share URL — copy this link" }),
  ).toHaveValue(/search=/);
  await page.reload();
  await expect(page.locator("article.program:not([hidden])")).toHaveCount(1);
});
