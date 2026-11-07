import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const browserLibraryPath = process.env.PLAYWRIGHT_BROWSER_LIBRARY_PATH ?? "/tmp/trackflow-browser-libs/usr/lib/x86_64-linux-gnu";
const browserEnv = process.platform === "linux" && existsSync(`${browserLibraryPath}/libglib-2.0.so.0`)
  ? {
      ...Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")),
      LD_LIBRARY_PATH: [browserLibraryPath, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":"),
    }
  : undefined;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure", launchOptions: browserEnv ? { env: browserEnv } : undefined },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --hostname 0.0.0.0 --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    env: { NEXT_PUBLIC_API_URL: "https://trackflow-api.test" },
  },
});