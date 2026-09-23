import assert from "node:assert/strict";
import fs from "node:fs";
import "../dist/search.js";
const seed = JSON.parse(fs.readFileSync("data/seed.json"));
const index = AtlasSearch.createIndex(seed);
for (const q of [
  "umami",
  "unami",
  "qzxvblorp",
  "spaceship pizza",
  "screening qzxvblorp",
]) {
  const r = index.search(q);
  assert.equal(r.ids.size, 0, q);
  assert.equal(r.candidates.length, 0, q);
}
assert.equal(index.search("Kinondo Kwetu").results[0].id, "kinondo");
assert.deepEqual([...index.search("country:Kenya cytology").ids], ["kinondo"]);
assert.equal(index.search("country:China screening").ids.has("kinondo"), false);
assert(
  AtlasSearch.createIndex([{ id: "colp", name: "Colposcopy screening" }])
    .search("colposcopy")
    .ids.has("colp"),
);
assert(
  AtlasSearch.createIndex([{ id: "video", name: "AI videocolposcopy" }])
    .search("colposcopy")
    .ids.has("video"),
);
const example = [
  {
    id: "a",
    name: "Cervical cytology",
    countries: ["Kenya"],
    outcome: "Pap test screening",
  },
  {
    id: "b",
    name: "Colposcopy",
    outcome: "Cervical cytology screening",
    editNotes: "umami",
  },
];
const x = AtlasSearch.createIndex(example);
assert.equal(x.search("pap smear").results[0].id, "a");
assert.equal(x.search("pap smear").candidates[0].id, "b");
assert.equal(x.search("umami").ids.size, 0);
assert.equal(
  AtlasSearch.createIndex(example, []).search("pap smear").results.length,
  0,
);
const disabled = AtlasSearch.defaultThesaurus.map((e) => ({
  ...e,
  enabled: false,
}));
assert.equal(
  AtlasSearch.createIndex(example, disabled).search("pap smear").results.length,
  0,
);
const broad = AtlasSearch.createIndex([
  { id: "a", name: "Evaluation", outcome: "No access to specialist screening" },
]);
assert.equal(
  broad.search("screening without access to specialists").ids.size,
  0,
  "Do not manufacture unapproved equivalence",
);
const samples = [];
for (let i = 0; i < 300; i++) {
  const t = performance.now();
  index.search("screening " + i);
  samples.push(performance.now() - t);
}
samples.sort((a, b) => a - b);
console.log(
  "PASS noise rejection, exact ranking, geography, synonyms, related candidate grounding, notes exclusion, disabled vocabulary. p95",
  samples[285].toFixed(2),
  "ms",
);
for (const q of [
  "umami",
  "unami",
  "colposcopy",
  "Kinondo Kwetu",
  "Pap smear",
  "screening country:Kenya",
])
  console.log(
    q,
    JSON.stringify(
      index.search(q).results.map((r) => ({ id: r.id, kind: r.kind })),
    ),
    "related",
    index.search(q).candidates.map((r) => r.id),
  );
