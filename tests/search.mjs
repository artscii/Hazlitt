import assert from "node:assert/strict";
import "../dist/search.js";
const p = {
  countries: ["Kenya"],
  name: "Kenya slide scans",
  publicationYear: "2024",
  date: "Reviewed 2026",
  source: "https://example.org/2023",
};
assert(AtlasSearch.matches(p, "2024"));
assert(AtlasSearch.matches(p, "Kenya year:2024"));
assert(AtlasSearch.matches(p, "2020–2025"));
assert(!AtlasSearch.matches(p, "2026"));
assert(!AtlasSearch.matches(p, "2023"));
assert(!AtlasSearch.matches({ ...p, publicationYear: "" }, "2024"));
assert(!AtlasSearch.matches(p, "2025-2020"));
assert(AtlasSearch.matches(p, ""));
console.log("Publication-year search passed.");
// Cached full-text lookup includes outcomes and originals, never inferred concepts.
const records = [
  {
    id: "a",
    name: "Phone examination",
    countries: ["Kenya"],
    publicationYear: "2024",
    outcome: "Sensitivity 91%.",
    originalTitle: "Évaluation clinique",
  },
  {
    id: "b",
    name: "Slide study",
    countries: ["Kenya"],
    publicationYear: "2023",
    outcome: "Digital cytology with sensitivity 94%.",
  },
  {
    id: "c",
    name: "Screening",
    countries: ["China"],
    publicationYear: "2024",
    outcome: "Sensitivity 99%.",
  },
  {
    id: "d",
    name: "Review",
    countries: ["Kenya"],
    publicationYear: "",
    date: "Reviewed 2024",
    outcome: "Sensitivity 81%.",
  },
];
const index = AtlasSearch.createIndex(records);
assert.deepEqual([...index.search("Kenya sensitivity 2024").ids], ["a"]);
assert.deepEqual([...index.search("missed cases").ids], []);
assert.deepEqual([...index.search("evaluation").ids], ["a"]);
assert.deepEqual(
  [...index.search("").ids],
  records.map((p) => p.id),
);
assert.equal(index.search("totallyunfindable").ids.size, 0);
const first = index.search("Kenya");
assert.strictEqual(index.search("Kenya"), first);
const large = AtlasSearch.createIndex(
  Array.from({ length: 1000 }, (_, i) => ({ ...records[i % 4], id: "p" + i })),
);
const began = performance.now();
for (let i = 0; i < 1000; i++)
  large.search(i % 2 ? "Kenya sensitivity 2024" : "cytology");
console.log(
  "Cached full-text benchmark, 1,000 queries / 1,000 records:",
  Math.round(performance.now() - began) + "ms",
);
// New records and changed country assignments derive geography without stored continent fields.
assert.deepEqual([...index.search("Africa").ids], ["a", "b", "d"]);
assert.deepEqual([...index.search("Asia 2024").ids], ["c"]);
assert(
  !AtlasSearch.matches(
    { countries: ["China"], outcome: "Compared with Africa" },
    "Africa",
  ),
);
const fresh = {
  id: "new",
  countries: ["Canada", "Kenya"],
  publicationYear: "2025",
};
assert(AtlasSearch.matches(fresh, "North America 2025"));
assert(AtlasSearch.matches(fresh, "Africa"));
fresh.countries = ["Peru"];
assert(!AtlasSearch.matches(fresh, "Africa"));
assert(AtlasSearch.matches(fresh, "South America"));
assert.deepEqual(
  [...AtlasSearch.createIndex([...records, fresh]).search("South America").ids],
  ["new"],
);
console.log(
  "Dynamic continent search passed, including cross-continent and edited/new records.",
);

assert.deepEqual([...index.search('"Africa"').ids], ["a", "b", "d"]);
assert.deepEqual([...index.search("“Asia”").ids], ["c"]);
assert.deepEqual([...index.search('"Kenya" 2024').ids], ["a"]);
assert(
  !AtlasSearch.matches({ countries: ["China"], outcome: "Kenya" }, '"Kenya"'),
);
