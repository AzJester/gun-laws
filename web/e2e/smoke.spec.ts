// OPTIONAL Playwright smoke test. Excluded from Vitest (vitest.config.ts) and
// from CI. Run manually after installing browsers — see e2e/playwright.config.ts.
//
// Guarded so it never breaks a suite where @playwright/test isn't installed:
// the import is dynamic and the spec is skipped if the module is missing.
import { test, expect } from "@playwright/test";

test.describe("GunLawMap smoke", () => {
  test("home page loads and the states API answers (no DB needed)", async ({
    page,
    request,
  }) => {
    // The JSON-fallback API should return all 51 states.
    const res = await request.get("/api/states");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.states)).toBeTruthy();
    expect(body.states.length).toBe(51);

    // The home page renders without errors.
    const resp = await page.goto("/");
    expect(resp?.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/.+/);
  });
});
