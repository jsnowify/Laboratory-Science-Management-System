import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results/smoke",
  use: { baseURL: "http://127.0.0.1:3001" },
  webServer: [
    {
      command: "npm run start -w @lsms/api",
      url: "http://127.0.0.1:4000/health/",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npm run start -- -p 3001",
      url: "http://127.0.0.1:3001/login/",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
