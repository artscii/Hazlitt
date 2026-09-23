import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { renderSearchPreview } from "../server/search-preview.mjs";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-share-"));
const file = path.join(dir, "test.sqlite");
let db = new DatabaseSync(file);
db.exec(fs.readFileSync("drizzle/0008_shared_searches.sql", "utf8"));
let projects = [{ id: "kinondo" }, { id: "bombo" }];
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
        async run() {
          return db.prepare(sql).run(...args);
        },
      };
    },
  },
  RENDER_SEARCH_PREVIEW: renderSearchPreview,
};
const ctx = vm.createContext({
  URL,
  Response,
  Request,
  Date,
  JSON,
  Set,
  Array,
  Number,
  Error,
  database: (e) => e.DB,
  records: async () => projects,
  body: (r) => r.json(),
  json: (d, status = 200) => Response.json(d, { status }),
  hash: async (s) => createHash("sha256").update(s).digest("hex"),
  ASSETS: {
    "/index.html": {
      body: '<html><head><title>Atlas</title><meta name="description" content="Atlas"></head><body></body></html>',
    },
  },
});
vm.runInContext(fs.readFileSync("server/search-sharing.js", "utf8"), ctx);
const call = (pathname, method = "GET", data, origin = "https://atlas.test") =>
  ctx.sharedSearchResponse(
    new Request("https://atlas.test" + pathname, {
      method,
      headers: { Origin: origin },
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
    env,
  );
try {
  const payload = {
    query: "screening country:Kenya",
    ids: ["kinondo"],
    filterIds: null,
  };
  const saved = await (await call("/api/search/share", "POST", payload)).json();
  assert.equal(saved.count, 1);
  assert.equal(new URL(saved.url).searchParams.get("q"), payload.query);
  assert.equal(
    (await (await call("/api/search/share", "POST", payload)).json()).id,
    saved.id,
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM shared_searches").get().n,
    1,
  );
  db.close();
  db = new DatabaseSync(file);
  const restored = await (await call("/api/search/share/" + saved.id)).json();
  assert.deepEqual(restored.ids, ["kinondo"]);
  const html = await (
    await call(new URL(saved.url).pathname + new URL(saved.url).search)
  ).text();
  assert.match(html, /1 Project/);
  assert.match(html, /og:image/);
  assert.match(html, /twitter:card/);
  const image = await call("/og/search/" + saved.id + ".png");
  assert.equal(image.headers.get("Content-Type"), "image/png");
  const png = Buffer.from(await image.arrayBuffer());
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.equal(
    (await call("/og/search/" + saved.id + ".png", "HEAD")).body,
    null,
  );
  const hostile = await (
    await call("/api/search/share", "POST", {
      query: "</title><script>alert(1)</script> $&",
      ids: [],
    })
  ).json();
  const escaped = await (
    await call(new URL(hostile.url).pathname + new URL(hostile.url).search)
  ).text();
  assert.ok(!escaped.includes("<script>"));
  assert.ok(escaped.includes("&lt;script&gt;"));
  assert.ok(escaped.includes("$&amp;"));
  assert.match(escaped, /0 Projects/);
  assert.equal(
    (await call("/api/search/share", "POST", payload, "https://other.test"))
      .status,
    403,
  );
  assert.equal(
    (await call("/api/search/share", "POST", { query: "x", ids: ["unknown"] }))
      .status,
    400,
  );
  assert.equal((await call("/api/search/share", "POST", null)).status, 400);
  assert.equal(
    (
      await call("/api/search/share", "POST", {
        query: "x".repeat(501),
        ids: [],
      })
    ).status,
    400,
  );
  assert.equal((await call("/api/search/share/" + "0".repeat(64))).status, 404);
  projects = [];
  assert.deepEqual(
    (await (await call("/api/search/share/" + saved.id)).json()).ids,
    [],
  );
  console.log(
    "Search sharing: durable deduplication, validation, metadata escaping, deletion handling and PNG rendering passed.",
  );
} finally {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
