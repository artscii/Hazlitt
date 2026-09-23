import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { createSearchService } from "../pilot/service.mjs";
let vectors = 0,
  updates = 0,
  block = null;
const llm = {
  embedContexts: [{}],
  embedModel: {},
  touchActivity() {},
  async ensureEmbedModel() {},
  async ensureEmbedContexts() {},
  async embed() {},
};
const fake = {
  internal: { llm },
  async update() {
    updates++;
  },
  async embed() {
    if (block) await block;
  },
  async searchVector() {
    vectors++;
    await new Promise((r) => setTimeout(r, 10));
    return [
      {
        file: createHash("sha256").update("b").digest("hex") + ".md",
        score: 0.8,
      },
    ];
  },
};
let catalog = {
  revision: "one",
  programs: [
    { id: "a", name: "Pap test", countries: ["Kenya"] },
    { id: "b", name: "Cervical cytology", countries: ["Kenya"] },
  ],
};
const getCatalog = async () => catalog;
const svc = createSearchService({
  rootDir: fs.mkdtempSync("/tmp/qmd-mock-"),
  refreshMs: 0,
  inferenceBudget: { capacity: 1, refillMs: 60000 },
  openStore: async () => fake,
});
svc.readiness(getCatalog);
await new Promise((r) => setTimeout(r, 50));
const call = (q) =>
  svc
    .searchRoute(
      new Request("http://qmd/api/search/query", {
        method: "POST",
        headers: { Origin: "http://qmd" },
        body: JSON.stringify({ query: q }),
      }),
      getCatalog,
    )
    .then((r) => r.json());
assert.equal((await call("umami")).results.length, 0);
assert.equal(vectors, 0);
assert.equal((await call("Pap test")).results[0].id, "a");
const [a, b] = await Promise.all([call("Pap smear"), call("Pap smear")]);
assert.deepEqual(
  a.results.map((r) => r.id),
  ["a", "b"],
);
assert.deepEqual(b.results, a.results);
assert.equal(vectors, 1);
assert.equal((await call("Pap smear")).cached, true);
assert.equal(vectors, 1);
for (let i = 0; i < 20; i++)
  assert.equal((await call("Pap smear")).cached, true);
assert.equal((await call("PAP SMEAR")).cached, true);
const limited = await call("pap smear country:Kenya");
assert.equal(limited.lexicalOnly, true);
assert.equal(limited.results[0].id, "a");
assert.equal(
  vectors,
  1,
  "cached requests bypass inference budget; new work stays bounded",
);
let release;
block = new Promise((r) => (release = r));
catalog = {
  ...catalog,
  revision: "two",
  programs: [...catalog.programs, { id: "c", name: "new record" }],
};
svc.readiness(getCatalog);
await new Promise((r) => setTimeout(r, 10));
assert.equal(
  (await call("Pap test")).results[0].id,
  "a",
  "old lexical snapshot remains usable",
);
assert.equal(svc.readiness(getCatalog).ready, true);
assert.equal(svc.readiness(getCatalog).refreshing, true);
release();
await new Promise((r) => setTimeout(r, 30));
assert.equal((await call("new record")).results[0].id, "c");
assert.equal(updates, 2);
console.log(
  "PASS background indexing, last snapshot availability, lexical bypass, grounded related results, query coalescing and cache invalidation",
);
