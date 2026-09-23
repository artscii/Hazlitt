import vm from "node:vm";
import fs from "node:fs";
import assert from "node:assert/strict";
const listeners = {},
  scripts = [],
  events = [];
let timers = [];
const document = {
  addEventListener: (n, fn) => (listeners["d:" + n] = fn),
  createElement: () => ({ dataset: {} }),
  head: { append: (s) => scripts.push(s) },
};
const window = {
  addEventListener: (n, fn) => (listeners[n] = fn),
  umami: { track: async (...x) => events.push(x) },
};
const context = {
  performance: { now: () => 100 },
  window,
  document,
  location: { pathname: "/", origin: "https://atlas.test" },
  navigator: {},
  fetch: async () => ({
    ok: true,
    json: async () => ({ enabled: true, websiteId: "test" }),
  }),
  setTimeout: (fn) => (timers.push(fn), timers.length),
  clearTimeout: (id) => {
    if (id) timers[id - 1] = null;
  },
  Promise,
  Set,
};
await vm.runInNewContext(
  fs.readFileSync("dist/analytics-client.js", "utf8"),
  context,
);
scripts[0].onload();
assert.equal(scripts[1].src, "/metrics/recorder.js");
listeners["d:input"]({ target: { id: "project-search" } });
const event = {
  detail: { query: "person@example.com", result_count: 0, engine: "qmd" },
};
listeners["atlas-search-complete"](event);
timers.filter(Boolean).forEach((fn) => fn());
assert.equal(events[1][0], "project-search");
assert.equal(events[1][1].query, "person@example.com");
assert.equal(events[1][1].origin, "typed");
assert.equal(events[1][1].result_count, 0);
listeners["atlas-search-complete"](event);
timers.filter(Boolean).forEach((fn) => fn());
assert.equal(events.length, 3);
listeners["d:click"]({ target: { closest: () => true } });
listeners["atlas-search-complete"]({
  detail: { query: "Africa", result_count: 9, engine: "keyword" },
});
timers.filter(Boolean).forEach((fn) => fn());
assert.equal(events[3][1].origin, "map");
console.log(
  "PASS completed search payloads, raw terms, zero results, duplicate suppression, map origin and recorder endpoints",
);
