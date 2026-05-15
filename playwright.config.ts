import { defineConfig, devices } from "@playwright/test";

const skipWebServer = process.env.GACHAGUARD_SKIP_WEBSERVER === "1";
const port = process.env.GACHAGUARD_E2E_PORT ?? "3100";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: "node ./scripts/playwright-webserver.mjs",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        gracefulShutdown: { signal: "SIGINT", timeout: 1_000 },
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
