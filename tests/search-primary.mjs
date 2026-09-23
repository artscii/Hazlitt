import { JSDOM } from "jsdom";
import fs from "node:fs";
import assert from "node:assert/strict";
const dom = new JSDOM(
  '<div class="project-search"><input id="project-search"></div>',
  { url: "http://localhost/", runScripts: "outside-only" },
);
const w = dom.window;
let calls = 0,
  resolve,
  applied = null,
  fallbacks = 0;
w.AtlasBootstrap = { config: Promise.resolve({ qmdEnabled: true }) };
w.atlasSearchIndex = {
  search: (q) => ({ candidates: q === "pap smear" ? [{ id: "related" }] : [] }),
};
w.fetch = async (url) => {
  if (url.endsWith("/status"))
    return { ok: true, json: async () => ({ ready: true }) };
  calls++;
  return new Promise((r) => {
    resolve = r;
  });
};
w.addEventListener("atlas-semantic-results", (e) => (applied = e.detail));
w.eval(fs.readFileSync("dist/semantic-search.js", "utf8"));
const input = w.document.querySelector("input");
const run = (q) => {
  input.value = q;
  return w.atlasPrimarySearch(q, () => fallbacks++);
};
try {
  await run("umami");
  assert.equal(fallbacks, 1);
  await new Promise((r) => setTimeout(r, 350));
  assert.equal(calls, 0);
  await run("pap smear");
  assert.equal(fallbacks, 2);
  await new Promise((r) => setTimeout(r, 350));
  assert.equal(calls, 1);
  await run("new query");
  resolve({ ok: true, json: async () => ({ results: [{ id: "obsolete" }] }) });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(applied, null);
  console.log(
    "PASS immediate lexical rendering, no inference for noise, stale response rejection",
  );
} finally {
  dom.window.close();
}
