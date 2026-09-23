import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { collect, dockerGet } from "../monitor/collector.mjs";
import { createMonitor } from "../monitor/server.mjs";
import { generateSystemDiagrams } from "../scripts/system-diagrams.mjs";
const id = "a".repeat(64);
const payload = await collect("atlas", async (path) =>
  path.startsWith("/containers/json?")
    ? [
        {
          Id: id,
          Labels: {
            "com.docker.compose.project": "atlas",
            "com.docker.compose.service": "atlas",
          },
          State: "running",
          Image: "atlas:test",
        },
        {
          Id: "b".repeat(64),
          Labels: { "com.docker.compose.project": "other" },
        },
      ]
    : path.endsWith("/json")
      ? {
          Config: { Env: ["SECRET=not-public"] },
          State: {
            Health: { Status: "healthy" },
            StartedAt: "2026-01-01T00:00:00Z",
          },
        }
      : {
          cpu_stats: {
            cpu_usage: { total_usage: 20 },
            system_cpu_usage: 100,
            online_cpus: 2,
          },
          precpu_stats: {
            cpu_usage: { total_usage: 10 },
            system_cpu_usage: 50,
          },
          memory_stats: { usage: 1024 },
        },
);
assert.equal(payload.services.length, 1);
assert(!JSON.stringify(payload).includes("SECRET"));
assert.equal(payload.services[0].cpuPercent, 40);
assert.throws(() => dockerGet("/containers/create"), /denied/);
const token = randomBytes(32).toString("hex");
let calls = 0;
const server = createMonitor({
  token,
  project: "atlas",
  collector: async () => {
    calls++;
    return payload;
  },
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = "http://127.0.0.1:" + server.address().port;
try {
  assert.equal((await fetch(base + "/status")).status, 401);
  assert.equal((await fetch(base + "/status", { method: "POST" })).status, 404);
  assert.equal((await fetch(base + "/containers/json")).status, 404);
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await fetch(base + "/status", {
          headers: { Authorization: "Bearer " + token },
        })
      ).status,
      200,
    );
  assert.equal(calls, 1);
} finally {
  server.close();
}
const docs = await generateSystemDiagrams();
assert.equal(docs.diagrams.length, 6);
assert(docs.diagrams.every((d) => d.source.startsWith("flowchart")));
assert(!JSON.stringify(docs).includes("MONITOR_SERVICE_TOKEN"));
console.log(
  "PASS authenticated read-only monitoring, project isolation, redacted inspect fields, caching and flow reference validation",
);
