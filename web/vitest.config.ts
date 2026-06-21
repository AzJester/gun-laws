import { fileURLToPath } from "node:url";
import path from "node:path";

import { defineConfig } from "vitest/config";

// Vitest config for the GunLawMap web app.
//
// - `node` environment: everything under test is server-side (fs / pure fns /
//   route handlers). No jsdom needed.
// - The `@/*` alias is resolved explicitly to ./src so test files import
//   `@/lib/...` exactly like the app does (mirrors tsconfig.json `paths`).
//   We set it directly rather than via vite-tsconfig-paths so this CJS-loaded
//   config has no ESM-only plugin dependency.
// - Tests target the NO-DB / NO-network / NO-key paths. NODE_ENV=test keeps the
//   email layer from ever attempting a real send, so CI needs no egress.
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src");

export default defineConfig({
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // Keep the optional Playwright e2e specs out of the Vitest run.
    exclude: ["node_modules/**", "e2e/**", ".next/**"],
    env: {
      NODE_ENV: "test",
    },
  },
});
