import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import worker from "../dist/server/index.js";
const db = new DatabaseSync(":memory:");
for (const name of fs
  .readdirSync("drizzle")
  .filter((n) => n.endsWith(".sql"))
  .sort())
  db.exec(fs.readFileSync("drizzle/" + name, "utf8"));
function statement(sql, args = []) {
  return {
    bind(...a) {
      return statement(sql, a);
    },
    async all() {
      const s = db.prepare(sql);
      return {
        results: s.columns().length ? s.all(...args) : [],
        meta: s.columns().length ? {} : s.run(...args),
      };
    },
    async first() {
      return db.prepare(sql).get(...args);
    },
    async run() {
      return { meta: db.prepare(sql).run(...args) };
    },
  };
}
const env = {
  DB: {
    prepare: statement,
    async batch(ss) {
      db.exec("BEGIN");
      try {
        const r = [];
        for (const s of ss) r.push(await s.all());
        db.exec("COMMIT");
        return r;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  },
};
const token = "a".repeat(64);
db.prepare("INSERT INTO sessions VALUES (?,?)").run(
  createHash("sha256").update(token).digest("hex"),
  Date.now() + 60000,
);
async function call(path, method = "GET", data, auth = true, extra = {}) {
  return worker.fetch(
    new Request("http://test" + path, {
      method,
      headers: {
        Origin: "http://test",
        ...(auth ? { Cookie: "atlas_session=" + token } : {}),
        ...extra,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
    env,
  );
}
assert.equal(
  (await call("/api/search/thesaurus", "PUT", {}, false)).status,
  401,
);
const before = await (await call("/api/search/thesaurus")).json();
const entries = [
  {
    term: "test phrase",
    equivalents: ["approved phrase"],
    related: [],
    enabled: true,
  },
];
assert.equal(
  (await call("/api/search/thesaurus", "PUT", { revision: 0, entries })).status,
  200,
);
assert.equal(
  (await call("/api/search/thesaurus", "PUT", { revision: 0, entries })).status,
  409,
);
assert.equal(
  (
    await call("/api/search/thesaurus", "PUT", {
      revision: 1,
      entries: [...entries, ...entries],
    })
  ).status,
  400,
);
assert.equal(
  (
    await call("/api/search/thesaurus", "PUT", {
      revision: 1,
      entries: before.entries,
    })
  ).status,
  200,
);
assert.equal(
  (await (await call("/api/search/thesaurus")).json()).history.length,
  2,
);
const catalog = await call("/api/search/catalog");
const etag = catalog.headers.get("etag");
assert.equal(
  (
    await call("/api/search/catalog", "GET", null, false, {
      "If-None-Match": etag,
    })
  ).status,
  304,
);
const data = await catalog.json();
assert(!("countries" in data));
assert(data.programs.every((p) => !("editNotes" in p)));
const css = await call("/style.css");
assert.equal(
  (
    await call("/style.css", "GET", null, false, {
      "If-None-Match": css.headers.get("etag"),
    })
  ).status,
  304,
);
const backup = await (await call("/api/db-backup")).text();
assert(backup.includes("search_thesaurus"));
assert(backup.includes("approved phrase"));
const configuration = await (await call("/api/config")).json();
assert.equal(
  (
    await call("/api/config", "PATCH", {
      revision: configuration.revision,
      qmdEnabled: false,
    })
  ).status,
  200,
);
assert.equal(
  (
    await call("/api/config", "PATCH", {
      revision: configuration.revision,
      palette: "ocean",
    })
  ).status,
  409,
);
const updated = await (await call("/api/config")).json();
assert.equal(updated.palette, configuration.palette);
assert.equal(updated.qmdEnabled, false);
for (let i = 3; i <= 55; i++)
  db.prepare("INSERT INTO search_thesaurus VALUES (?,?,?)").run(
    i,
    Date.now(),
    JSON.stringify(entries),
  );
const page = await (await call("/api/search/thesaurus")).json();
assert.equal(page.history.length, 50);
assert(page.hasMore);
assert(!("entries" in page.history[0]));
const earlier = await (
  await call("/api/search/thesaurus?before=" + page.history.at(-1).revision)
).json();
assert.equal(earlier.history.length, 5);
assert(!earlier.hasMore);
assert.deepEqual(
  (await (await call("/api/search/thesaurus?revision=1")).json()).entries,
  entries,
);
console.log(
  "PASS protected vocabulary edits, revision conflicts, duplicate validation, restore-as-new-version, backup inclusion, slim catalogue and asset validators",
);
db.close();
