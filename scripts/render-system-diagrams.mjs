import { chromium } from "@playwright/test";
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

// Rendering is a build-time cost. Visitors receive SVG, never Mermaid's runtime.
export async function renderSystemDiagrams(data) {
  const cacheDir = path.resolve(".cache/system-svg");
  fs.mkdirSync(cacheDir, { recursive: true });
  const key = (d) =>
    createHash("sha256")
      .update("mermaid-11.12.0-neutral-v1:" + d.source)
      .digest("hex");
  const missing = data.diagrams.filter(
    (d) => !fs.existsSync(path.join(cacheDir, key(d) + ".svg")),
  );
  if (missing.length) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-diagrams-"));
    let browser;
    try {
      await build({
        stdin: {
          contents: 'import mermaid from "mermaid"; window.mermaid = mermaid;',
          resolveDir: process.cwd(),
        },
        bundle: true,
        outfile: path.join(tmp, "renderer.js"),
        minify: true,
      });
      const macChrome = "/Applications/Chrome.app/Contents/MacOS/Google Chrome";
      const executablePath =
        process.env.CHROMIUM_PATH ||
        (fs.existsSync(macChrome) ? macChrome : undefined);
      browser = await chromium.launch({
        executablePath,
        headless: true,
        args: ["--no-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent("<!doctype html><html><body></body></html>");
      await page.addScriptTag({ path: path.join(tmp, "renderer.js") });
      await page.evaluate(() =>
        window.mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
          flowchart: { useMaxWidth: false },
          maxTextSize: 150000,
        }),
      );
      for (const d of missing) {
        const svg = await page.evaluate(
          async ({ id, source }) =>
            (await window.mermaid.render("release-" + id, source)).svg,
          d,
        );
        fs.writeFileSync(path.join(cacheDir, key(d) + ".svg"), svg);
      }
    } finally {
      await browser?.close();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  return {
    ...data,
    diagrams: data.diagrams.map((d) => ({
      ...d,
      svg: fs.readFileSync(path.join(cacheDir, key(d) + ".svg"), "utf8"),
    })),
  };
}
