import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";
process.env.ATLAS_TEST_PASSWORD ||= randomBytes(24).toString("hex");
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  use: {
    launchOptions: process.env.ATLAS_CHROMIUM
      ? { executablePath: process.env.ATLAS_CHROMIUM }
      : {},
    baseURL: "http://127.0.0.1:8132",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1360, height: 900 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "node scripts/browser-server.mjs",
    url: "http://127.0.0.1:8132/healthz",
    reuseExistingServer: false,
  },
});
