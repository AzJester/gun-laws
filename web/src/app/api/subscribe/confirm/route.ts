import { confirmSubscription } from "@/lib/subscriptions";

// Dynamic + nodejs: DB access at request time only.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — GunLawMap</title></head>
  <body style="font-family:system-ui,Arial,sans-serif;background:#0c1014;color:#e6edf3;display:grid;place-items:center;min-height:100vh;margin:0">
  <main style="max-width:480px;padding:28px;border:1px solid #263039;border-radius:14px;background:#11161d">
  <h1 style="margin:0 0 10px;font-size:20px">${title}</h1>
  <p style="margin:0 0 16px;color:#9fb0bf;line-height:1.5">${body}</p>
  <a href="/alerts" style="color:#3a86c8">Manage alert preferences</a> ·
  <a href="/" style="color:#3a86c8">Back to the map</a>
  </main></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/** GET /api/subscribe/confirm?token=… — completes double-opt-in. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const result = await confirmSubscription(token);

  if (result.ok) {
    return page(
      "Subscription confirmed",
      "You're all set — you'll receive a digest when tracked firearm laws change in your selected states/policies. " +
        "Reciprocity and law data are informational only, not legal advice.",
    );
  }
  if (result.reason === "no_database") {
    return page(
      "Not configured",
      "Subscriptions are not available on this deployment (no database).",
      503,
    );
  }
  if (result.reason === "not_found") {
    return page(
      "Link not recognized",
      "This confirmation link is invalid or has already been used. Try subscribing again from the alerts page.",
      404,
    );
  }
  return page(
    "Couldn't confirm",
    "Something went wrong confirming your subscription. Please try again.",
    400,
  );
}
