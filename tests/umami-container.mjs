// Run only against an isolated local Umami test stack with default test credentials.
import assert from "node:assert/strict";
const base = process.env.UMAMI_TEST_URL || "http://127.0.0.1:8082";
assert.equal(new URL(base).hostname, "127.0.0.1");
async function api(path, body, token) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
      "X-Atlas-Client-IP": "8.8.8.8",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.ok(r.ok, `${path}: ${r.status} ${!r.ok ? await r.text() : ""}`);
  return r.json();
}
assert.equal((await api("/api/heartbeat")).ok, true);
const { token } = await api("/api/auth/login", {
  username: "admin",
  password: "umami",
});
const site = await api(
  "/api/websites",
  { name: "Atlas test " + Date.now(), domain: "atlas.test" },
  token,
);
const payload = {
  website: site.id,
  hostname: "atlas.test",
  url: "/",
  referrer: "",
  screen: "1200x800",
  language: "en-US",
  title: "Atlas",
};
await api("/api/send", { type: "event", payload });
await api("/api/send", {
  type: "event",
  payload: { ...payload, name: "project-view", data: { project_id: "bombo" } },
});
const stats = await api(
  `/api/websites/${site.id}/stats?startAt=${Date.now() - 60000}&endAt=${Date.now() + 60000}`,
  null,
  token,
);

assert.equal(stats.pageviews, 1);
assert.equal(stats.visitors, 1);
console.log(
  "PASS real Umami login, website creation, pageview and project event ingestion; persisted pageview/visitor statistics",
  site.id,
);
