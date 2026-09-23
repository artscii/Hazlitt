import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { collect } from "./collector.mjs";
export function createMonitor({ token, project, collector = collect }) {
  if (!token || token.length < 32 || !project)
    throw Error("Monitor token and project required");
  let snapshot, pending;
  return http.createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    if (req.method === "GET" && req.url === "/health")
      return send(200, { ok: true });
    if (req.method !== "GET" || req.url !== "/status")
      return send(404, { error: "Not found" });
    const actual = Buffer.from(req.headers.authorization || ""),
      expected = Buffer.from("Bearer " + token);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return send(401, { error: "Unauthorized" });
    try {
      if (!snapshot || Date.now() - Date.parse(snapshot.collectedAt) > 30000) {
        pending ||= collector(project).finally(() => (pending = null));
        snapshot = await pending;
      }
      send(200, snapshot);
    } catch {
      send(503, { error: "Container status unavailable" });
    }
  });
}
if (process.env.MONITOR_SERVICE_TOKEN)
  createMonitor({
    token: process.env.MONITOR_SERVICE_TOKEN,
    project: process.env.MONITOR_PROJECT,
  }).listen(8080, "0.0.0.0");
