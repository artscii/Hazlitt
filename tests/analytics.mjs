import { testPasswordHash, testPassword } from "./password-fixture.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../dist/server/index.js";
const sqlite = new DatabaseSync(":memory:");
for (const name of fs
  .readdirSync("drizzle")
  .filter((n) => n.endsWith(".sql"))
  .sort())
  sqlite.exec(fs.readFileSync("drizzle/" + name, "utf8"));
function statement(sql, args = []) {
  return {
    bind(...next) {
      return statement(sql, next);
    },
    async all() {
      return { results: sqlite.prepare(sql).all(...args) };
    },
    async first() {
      return sqlite.prepare(sql).get(...args) || null;
    },
    async run() {
      const r = sqlite.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes) } };
    },
  };
}
const env = {
  DB: {
    prepare: statement,
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const out = [];
        for (const s of statements) out.push(await s.run());
        sqlite.exec("COMMIT");
        return out;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  },
  ADMIN_PASSWORD_HASH: testPasswordHash,
};
let cookie = "";
async function call(path, method = "GET", body, origin = "https://atlas.test") {
  const r = await worker.fetch(
    new Request("https://atlas.test" + path, {
      method,
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        Cookie: cookie,
        "CF-Connecting-IP": "203.0.113.8",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
  const data = await r.json();
  if (r.headers.get("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  return { status: r.status, data };
}

assert.equal((await call("/api/analytics")).status, 401);
const visit = crypto.randomUUID();
assert.equal(
  (await call("/api/analytics/event", "POST", { visit, project: "bombo" })).data
    .ignored,
  true,
);
assert.equal(
  sqlite.prepare("SELECT COUNT(*) n FROM analytics_visits").get().n,
  0,
);
assert.equal(
  (await call("/api/analytics/event", "POST", { visit }, "https://evil.test"))
    .status,
  403,
);
assert.equal((await call("/api/analytics/config")).data.enabled, false);
env.UMAMI_WEBSITE_ID = crypto.randomUUID();
env.UMAMI_DASHBOARD_URL = "https://atlas.test:8443/";
let config = (await call("/api/analytics/config")).data;
assert.equal(config.enabled, true);
assert.equal(config.dashboardUrl, "");
env.UMAMI_DASHBOARD_URL = "javascript:alert(1)";
assert.equal((await call("/api/analytics/config")).data.enabled, false);
env.UMAMI_DASHBOARD_URL = "https://atlas.test:8443/";
assert.equal(
  (await call("/api/login", "POST", { password: testPassword })).status,
  200,
);
config = (await call("/api/analytics/config")).data;
assert.equal(config.enabled, false);
assert.equal(config.dashboardUrl, env.UMAMI_DASHBOARD_URL);
console.log(
  "PASS analytics retirement, no legacy writes, origin protection, Umami configuration and authenticated visitor exclusion",
);
