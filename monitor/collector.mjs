import http from "node:http";
export function dockerGet(path) {
  if (
    !/^\/containers\/(?:json\?[^\s]*|[a-f0-9]{64}\/(?:json|stats\?stream=false))$/.test(
      path,
    )
  )
    throw Error("Docker route denied");
  return new Promise((resolve, reject) => {
    const req = http.get(
      { socketPath: "/var/run/docker.sock", path, timeout: 3000 },
      (res) => {
        let size = 0;
        const chunks = [];
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024)
            req.destroy(Error("Docker response too large"));
          else chunks.push(chunk);
        });
        res.on("end", () => {
          try {
            if (res.statusCode !== 200) throw Error("Docker request failed");
            resolve(JSON.parse(Buffer.concat(chunks)));
          } catch (error) {
            reject(error);
          }
        });
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(Error("Docker timed out")));
    req.on("error", reject);
  });
}
export async function collect(project, get = dockerGet) {
  const filters = encodeURIComponent(
    JSON.stringify({ label: ["com.docker.compose.project=" + project] }),
  );
  const containers = await get("/containers/json?all=1&filters=" + filters);
  const selected = containers
    .filter(
      (c) =>
        c.Labels?.["com.docker.compose.project"] === project &&
        /^[a-f0-9]{64}$/.test(c.Id),
    )
    .slice(0, 20);
  const services = [];
  // Sequential collection bounds load on the Docker daemon.
  for (const c of selected) {
    const row = {
      service: c.Labels["com.docker.compose.service"] || "unknown",
      image: c.Image,
      state: c.State,
      health: "unknown",
      startedAt: null,
      cpuPercent: null,
      memoryBytes: null,
    };
    try {
      const detail = await get("/containers/" + c.Id + "/json");
      row.health = detail.State?.Health?.Status || "not configured";
      row.startedAt = detail.State?.StartedAt || null;
      if (c.State === "running") {
        const stats = await get("/containers/" + c.Id + "/stats?stream=false");
        const cpu =
            (stats.cpu_stats?.cpu_usage?.total_usage || 0) -
            (stats.precpu_stats?.cpu_usage?.total_usage || 0),
          system =
            (stats.cpu_stats?.system_cpu_usage || 0) -
            (stats.precpu_stats?.system_cpu_usage || 0);
        row.cpuPercent =
          system > 0
            ? Math.max(
                0,
                Math.round(
                  (cpu / system) * (stats.cpu_stats?.online_cpus || 1) * 1000,
                ) / 10,
              )
            : null;
        row.memoryBytes = stats.memory_stats?.usage ?? null;
      }
    } catch {
      row.partial = true;
    }
    services.push(row);
  }
  return { collectedAt: new Date().toISOString(), services };
}
