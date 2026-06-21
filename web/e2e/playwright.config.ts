// OPTIONAL end-to-end smoke test config (Playwright).
//
// This is NOT part of CI and NOT part of `npm test` (Vitest excludes e2e/**).
// Browser binaries are blocked in some environments, so this is opt-in:
//
//   cd web
//   npm i -D @playwright/test
//   npx playwright install chromium
//   npm run test:e2e
//
// It boots the app (no DB needed — JSON fallback) and runs one smoke spec.
// If @playwright/test is not installed, this file simply won't be loaded.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts/,
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "off",
  },
  // Build + start the app on the JSON fallback (no DATABASE_URL).
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { DATABASE_URL: "" },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
