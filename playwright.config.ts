import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3200";
const baseURL = `http://127.0.0.1:${port}`;
const chromiumPath = process.env.E2E_CHROMIUM_PATH ??
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const launchOptions = {
  ...(chromiumPath ? { executablePath: chromiumPath } : {}),
  ...(process.platform === "linux" ? { args: ["--no-sandbox", "--disable-dev-shm-usage"] } : {}),
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  outputDir: "/tmp/stockkonnect-playwright-results",
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    launchOptions,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
