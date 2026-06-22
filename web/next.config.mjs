/** @type {import('next').NextConfig} */

// Security headers applied to every route. Kept deliberately pragmatic so the
// app (Next.js App Router + Tailwind) still renders:
//
//  - Content-Security-Policy:
//      * default-src 'self'                — same-origin by default.
//      * script-src 'self' 'unsafe-inline' — Next.js injects small inline
//        bootstrap scripts (and, in dev, eval for HMR). A strict nonce-based CSP
//        would require wiring a per-request nonce through every <Script>; until
//        that's in place we allow inline scripts (documented relaxation). In dev
//        we additionally allow 'unsafe-eval' (React Refresh / HMR).
//      * style-src 'self' 'unsafe-inline' — Next/Tailwind inject inline styles
//        and <style> tags; 'unsafe-inline' is required for these to apply.
//      * img-src 'self' data: blob:       — inline SVG map + data/blob images.
//      * font-src 'self' data:            — self-hosted/data fonts.
//      * connect-src 'self'               — same-origin fetches (the app's API).
//      * frame-ancestors 'none'           — defense-in-depth clickjacking guard
//        (mirrors X-Frame-Options: DENY). The public /embed widget routes are
//        the one exception: they are framable (relaxed headers, see below).
//      * base-uri 'self'; form-action 'self'; object-src 'none'.
//  - X-Content-Type-Options: nosniff
//  - Referrer-Policy: strict-origin-when-cross-origin
//  - X-Frame-Options: DENY
//  - Permissions-Policy: camera/microphone/geolocation disabled (unused).
const isDev = process.env.NODE_ENV === "development";

// Shared CSP directives, minus frame-ancestors (which differs per route group).
const baseCspDirectives = [
  "default-src 'self'",
  // 'unsafe-inline' for Next.js' inline bootstrap scripts; 'unsafe-eval' only in
  // dev for React Refresh / HMR.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // 'self' covers the app's own API; ws: in dev for the HMR socket.
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
];

// Strict CSP for all non-embed routes: framing disallowed.
const csp = [...baseCspDirectives, "frame-ancestors 'none'"].join("; ");

// Relaxed CSP for the public /embed widget: framable from anywhere. All other
// directives stay strict; only frame-ancestors opens up (mirrors dropping
// X-Frame-Options for those routes).
const embedCsp = [...baseCspDirectives, "frame-ancestors *"].join("; ");

// Strict headers for every non-embed route (includes X-Frame-Options: DENY).
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// Embed headers: same hardening MINUS X-Frame-Options: DENY, with a framable
// CSP. Deliberately omits X-Frame-Options so the widget can be iframed by
// newsrooms/blogs on other origins.
const embedSecurityHeaders = [
  { key: "Content-Security-Policy", value: embedCsp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// Long-cache the generated static data (states list + per-state detail +
// time-series JSON under public/data/). These are produced at build time by
// scripts/gen-static-data.ts and only change on a redeploy, so they can be
// cached for an hour and served stale-while-revalidate for a day. Server mode
// only — `output: "export"` has no server to set headers (CDN config handles it
// there), so this is omitted in EXPORT mode.
const dataCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=3600, stale-while-revalidate=86400",
  },
];

// Dual-mode config:
//
//  - NORMAL mode (no PAGES_EXPORT): the current server app. Keeps headers() (the
//    security headers above) and all the dynamic API/feed routes.
//
//  - EXPORT mode (PAGES_EXPORT=1): a fully static site for GitHub Pages
//    (`next build` → out/). Served under the project-pages base path /gun-laws.
//    `output: "export"` does NOT support a headers() function (there is no server
//    to set them), so we deliberately omit it in this mode.
const isExport = process.env.PAGES_EXPORT === "1";

/** @type {import('next').NextConfig} */
const nextConfig = isExport
  ? {
      reactStrictMode: true,
      // Lint runs as a dedicated CI step (`npm run lint`), never during the
      // build — so a lint issue can't block a deploy. See .eslintrc.json.
      eslint: { ignoreDuringBuilds: true },
      output: "export",
      basePath: "/gun-laws",
      images: { unoptimized: true },
      trailingSlash: true,
      // No headers() in export mode — unsupported with `output: "export"`.
    }
  : {
      reactStrictMode: true,
      // Lint runs as a dedicated CI step (`npm run lint`), never during the
      // build — so a lint issue can't block a deploy. See .eslintrc.json.
      eslint: { ignoreDuringBuilds: true },
      // Enable src/instrumentation.ts (register() boot log + onRequestError
      // forwarding). Server mode only — the export config above deliberately
      // omits it so `output: "export"` never evaluates server-only code.
      experimental: { instrumentationHook: true },
      async headers() {
        return [
          {
            // Public embed widget: framable. Relaxed headers (no X-Frame-Options
            // DENY, CSP frame-ancestors *). Most-specific rules first.
            source: "/embed",
            headers: embedSecurityHeaders,
          },
          {
            source: "/embed/:path*",
            headers: embedSecurityHeaders,
          },
          {
            // All other routes: strict headers (X-Frame-Options DENY +
            // frame-ancestors 'none'). The negative lookahead excludes /embed so
            // the framable routes above are the sole source of their headers
            // (avoids emitting X-Frame-Options for them).
            source: "/((?!embed$|embed/).*)",
            headers: securityHeaders,
          },
          {
            // Long-cache the generated static data assets.
            source: "/data/:path*",
            headers: dataCacheHeaders,
          },
        ];
      },
    };

export default nextConfig;
