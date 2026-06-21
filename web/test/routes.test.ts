import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Route-handler integration tests. We import the exported GET/POST and invoke
// them with a Request directly — no running server, no DB. DATABASE_URL is
// forced unset so every handler takes its JSON fallback / graceful path.
const savedDbUrl = process.env.DATABASE_URL;
beforeAll(() => {
  delete process.env.DATABASE_URL;
});
afterAll(() => {
  if (savedDbUrl !== undefined) process.env.DATABASE_URL = savedDbUrl;
});

describe("GET /api/states", () => {
  it("returns 200 with 51 states + a disclaimer", async () => {
    const { GET } = await import("@/app/api/states/route");
    const res = await GET(new Request("http://test/api/states"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.states)).toBe(true);
    expect(body.states).toHaveLength(51);
    expect(typeof body.disclaimer).toBe("string");
    expect(body.disclaimer.length).toBeGreaterThan(0);
  });
});

describe("GET /api/states/[code]", () => {
  it("returns 200 for CA with provisions", async () => {
    const { GET } = await import("@/app/api/states/[code]/route");
    const res = await GET(new Request("http://test/api/states/CA"), {
      params: { code: "CA" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.state.code).toBe("CA");
    expect(body.state.grade).toBe("F");
    expect(Array.isArray(body.state.provisions)).toBe(true);
    expect(body.state.provisions.length).toBeGreaterThan(0);
  });

  it("returns 404 for an unknown code", async () => {
    const { GET } = await import("@/app/api/states/[code]/route");
    const res = await GET(new Request("http://test/api/states/ZZ"), {
      params: { code: "ZZ" },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
  });
});

describe("GET /api/changelog", () => {
  it("returns 200 with a changes array", async () => {
    const { GET } = await import("@/app/api/changelog/route");
    const res = await GET(new Request("http://test/api/changelog"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.changes)).toBe(true);
    expect(body.count).toBe(body.changes.length);
  });
});

describe("POST /api/subscribe (no DB)", () => {
  it("returns 503 gracefully when there is no database", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    const req = new Request("http://test/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.configured).toBe(false);
  });

  it("returns 400 for a bad email", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    const req = new Request("http://test/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
  });
});

describe("GET /feed.xml", () => {
  it("returns 200 atom XML with entries", async () => {
    const { GET } = await import("@/app/feed.xml/route");
    const res = await GET(new Request("http://test/feed.xml"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("xml");
    const xml = await res.text();
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<feed");
    expect(xml).toContain("<entry>");
    // Sanity-check it is well-formed enough to find balanced feed tags.
    expect(xml).toContain("</feed>");
    const entryCount = (xml.match(/<entry>/g) ?? []).length;
    expect(entryCount).toBeGreaterThan(0);
  });
});
