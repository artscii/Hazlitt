import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const excluded = new Set(["umami-container.mjs", "password-fixture.mjs"]);
for (const file of readdirSync("tests")
  .filter((n) => n.endsWith(".mjs") && !excluded.has(n))
  .sort()) {
  console.log("\nTEST " + file);
  const result = spawnSync(process.execPath, ["tests/" + file], {
    stdio: "inherit",
    timeout: 120000,
  });
  if (result.error || result.status !== 0) {
    console.error(result.error || "Test failed");
    process.exit(1);
  }
}
