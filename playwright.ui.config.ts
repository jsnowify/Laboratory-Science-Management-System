import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  testMatch: "**/*.spec.ts",
  outputDir: "test-results/ui",
  timeout: 180_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3100", browserName: "chromium", channel: process.env.UI_BROWSER_CHANNEL || undefined, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    { command: "node tests/ui/fixture-server.mjs", url: "http://127.0.0.1:4100/health/", timeout: 30_000 },
    { command: "npm run start -- -p 3100", url: "http://127.0.0.1:3100/login/", timeout: 60_000, env: { LSMS_BUILD_DIR: ".next-ui", API_INTERNAL_URL: "http://127.0.0.1:4100" } },
  ],
});
