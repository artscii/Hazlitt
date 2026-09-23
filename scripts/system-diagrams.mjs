import fs from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { parse } from "yaml";
import { cruise } from "dependency-cruiser";
export async function generateSystemDiagrams() {
  const version = JSON.parse(fs.readFileSync("package.json")).version;
  let commit = process.env.ATLAS_SOURCE_REVISION || "";
  if (!commit)
    try {
      commit = execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {}
  if (!/^[a-f0-9]{40}$/.test(commit)) commit = null;
  const flows = JSON.parse(fs.readFileSync("src/system/flows.json")),
    worker = fs.readFileSync("server/worker.js", "utf8");
  const diagrams = [];
  const quote = (s) => JSON.stringify(String(s).replace(/[<>]/g, ""));
  for (const flow of flows) {
    for (const [, , file] of flow.nodes)
      if (!fs.existsSync(file)) throw Error("Missing flow source: " + file);
    for (const route of flow.routes)
      if (!worker.includes(route))
        throw Error("Missing documented route: " + route);
    diagrams.push({
      id: flow.id,
      title: flow.title,
      kind: "Reviewed application flow",
      source:
        "flowchart LR\n" +
        flow.nodes.map(([id, title]) => `${id}[${quote(title)}]`).join("\n") +
        "\n" +
        flow.edges
          .map(
            ([a, b, label]) =>
              `${a} -->${label ? "|" + quote(label) + "|" : ""} ${b}`,
          )
          .join("\n"),
      files: flow.nodes.map((n) => n[2]),
    });
  }
  const composeFiles = [
    "compose.yaml",
    "compose.qmd.yaml",
    "compose.umami.yaml",
    "compose.system.yaml",
  ];
  let services = {};
  for (const file of composeFiles) {
    const c = parse(fs.readFileSync(file, "utf8"));
    for (const [name, s] of Object.entries(c.services || {}))
      services[name] = { ...services[name], ...s };
  }
  const lines = [
    "flowchart LR",
    'browser["Browser"] --> caddy["Caddy — host service"]',
    "caddy --> atlas",
    "caddy --> umami",
  ];
  for (const [name, s] of Object.entries(services)) {
    lines.push(`${name.replaceAll("-", "_")}[${quote(name)}]`);
    for (const v of s.volumes || []) {
      const value = typeof v === "string" ? v : v.source;
      const mount = value.split(":")[0];
      const id =
        "v" + createHash("sha256").update(mount).digest("hex").slice(0, 8);
      lines.push(`${id}[${quote(mount)}] -.-> ${name.replaceAll("-", "_")}`);
    }
    for (const dep of Object.keys(
      Array.isArray(s.depends_on)
        ? Object.fromEntries(s.depends_on.map((d) => [d, true]))
        : s.depends_on || {},
    ))
      lines.push(
        `${name.replaceAll("-", "_")} --> ${dep.replaceAll("-", "_")}`,
      );
  }
  lines.push(
    "atlas --> qmd",
    "atlas --> monitor",
    'monitor -. "Read-only API" .-> docker["Host Docker socket"]',
  );
  diagrams.unshift({
    id: "deployment",
    title: "Deployment",
    kind: "Declared configuration · optional overlays included",
    source: lines.join("\n"),
    files: composeFiles,
  });
  const result = await cruise(["server", "pilot", "monitor"], {
    outputType: "json",
    exclude: "node_modules|pilot/.data|dist/server",
    doNotFollow: { path: "node_modules|dist" },
  });
  const modules = JSON.parse(result.output).modules;
  const graph = ["flowchart LR"];
  const id = (file) =>
    "n" + createHash("sha256").update(file).digest("hex").slice(0, 10);
  for (const m of modules.filter(
    (m) =>
      !m.source.startsWith("node_modules") && !m.source.startsWith("dist/"),
  )) {
    graph.push(`${id(m.source)}[${quote(m.source)}]`);
    for (const d of m.dependencies.filter(
      (d) =>
        d.resolved && !d.resolved.startsWith("node_modules") && !d.coreModule,
    ))
      graph.push(`${id(m.source)} --> ${id(d.resolved)}[${quote(d.resolved)}]`);
  }
  // Shared-scope fragments are build composition, not module imports.
  for (const name of [
    "projects",
    "history",
    "settings",
    "navigation",
    "workspace",
    "transitions",
  ])
    graph.push(
      `${id("scripts/build.mjs")}["scripts/build.mjs"] -.-> ${id(name)}[${quote("src/admin/" + name + ".js")}]`,
    );
  diagrams.push({
    id: "code",
    title: "Code structure",
    kind: "Extracted imports · dotted edges are build composition",
    source: graph.join("\n"),
    files: modules
      .filter((m) => !m.source.startsWith("node_modules"))
      .map((m) => m.source),
  });
  return {
    version,
    commit,
    sourceHash: createHash("sha256")
      .update(JSON.stringify(diagrams))
      .digest("hex")
      .slice(0, 16),
    diagrams,
  };
}
