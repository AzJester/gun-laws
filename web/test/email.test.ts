import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { sendEmail, resolveProvider } from "@/lib/email";

describe("email: graceful degradation", () => {
  const savedResend = process.env.RESEND_API_KEY;
  const savedDryRun = process.env.EMAIL_DRY_RUN;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_DRY_RUN;
    // NODE_ENV is "test" under Vitest, which also forces skip — that is fine.
  });
  afterEach(() => {
    if (savedResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = savedResend;
    if (savedDryRun === undefined) delete process.env.EMAIL_DRY_RUN;
    else process.env.EMAIL_DRY_RUN = savedDryRun;
  });

  it("resolveProvider() is 'none' with no key", () => {
    expect(resolveProvider()).toBe("none");
  });

  it("sendEmail returns skipped (not delivered) and never throws with no provider key", async () => {
    const res = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>hi</p>",
    });
    expect(res.delivered).toBe(false);
    expect(res.skipped).toBe(true);
    expect(typeof res.reason).toBe("string");
  });

  it("never attempts a real network send under test mode", async () => {
    // With NODE_ENV=test the function short-circuits before fetch; even if a key
    // were present it would skip. This guards CI against network egress.
    process.env.RESEND_API_KEY = "fake-key-should-not-be-used";
    const res = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>hi</p>",
    });
    expect(res.delivered).toBe(false);
    expect(res.skipped).toBe(true);
  });
});
