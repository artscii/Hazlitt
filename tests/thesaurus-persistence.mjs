import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { DatabaseSync } from "node:sqlite";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-vocabulary-"));
const file = path.join(dir, "atlas.sqlite");
let db;
function boot() {
  db = new DatabaseSync(file);
  db.exec(
    "CREATE TABLE IF NOT EXISTS search_thesaurus (revision INTEGER PRIMARY KEY, at INTEGER NOT NULL, payload TEXT NOT NULL)",
  );
  const env = {
    DB: {
      prepare(sql) {
        let args = [];
        return {
          bind(...v) {
            args = v;
            return this;
          },
          async first() {
            return db.prepare(sql).get(...args);
          },
          async all() {
            return { results: db.prepare(sql).all(...args) };
          },
          async run() {
            return { meta: db.prepare(sql).run(...args) };
          },
        };
      },
    },
  };
  const ctx = vm.createContext({
    URL,
    Response,
    Request,
    Date,
    JSON,
    Number,
    Array,
    Set,
    Error,
    AtlasSchema: JSON.parse(fs.readFileSync("src/project-schema.json")),
    database: (env) => env.DB,
    body: (r) => r.json(),
    json: (d, s = 200) => Response.json(d, { status: s }),
  });
  vm.runInContext(
    fs.readFileSync("src/search.js", "utf8") +
      "\n" +
      fs.readFileSync("server/search-settings.js", "utf8"),
    ctx,
  );
  return {
    ctx,
    env,
    call: async (method = "GET", data) =>
      ctx.vocabularyRoute(
        new Request("http://test/api/search/thesaurus", {
          method,
          body: data ? JSON.stringify(data) : undefined,
        }),
        env,
      ),
  };
}
try {
  let app = boot();
  const initial = await (await app.call()).json();
  const entries = structuredClone(initial.entries);
  entries.find((e) => e.term === "via").equivalents.push("acetic");
  const saved = await (
    await app.call("PUT", { revision: initial.revision, entries })
  ).json();
  assert.equal(saved.revision, 1);
  db.close(); // Simulate a fresh process opening the same persistent volume.
  app = boot();
  const restored = await (await app.call()).json();
  assert.equal(restored.revision, 1);
  assert.deepEqual(restored.entries, entries);
  const index = app.ctx.AtlasSearch.createIndex(
    [
      { id: "via", name: "VIA screening" },
      { id: "acid", name: "Acetic-acid imaging" },
      { id: "full", name: "Visual inspection with acetic acid" },
      { id: "noise", name: "Unrelated project" },
    ],
    restored.entries,
  );
  for (const query of [
    "via",
    "VIA",
    "acetic",
    "ACETIC",
    "visual inspection with acetic acid",
  ]) {
    assert.deepEqual([...index.search(query).ids].sort(), [
      "acid",
      "full",
      "via",
    ]);
  }
  assert.equal(index.search("umami").ids.size, 0);
  const stale = await app.call("PUT", {
    revision: 0,
    entries: initial.entries,
  });
  assert.equal(stale.status, 409);
  assert.equal((await (await app.call()).json()).revision, 1);
  console.log(
    "PASS VIA/acetic aliases survive SQLite close/reopen and fresh runtime; case-insensitive bidirectional matching, noise rejection and stale-save protection",
  );
} finally {
  db?.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
