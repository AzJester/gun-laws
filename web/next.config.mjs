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
//        (mirrors X-Frame-Options: DENY). If a public embed route is ever added,
//        relax this for that path only.
//      * base-uri 'self'; form-action 'self'; object-src 'none'.
//  - X-Content-Type-Options: nosniff
//  - Referrer-Policy: strict-origin-when-cross-origin
//  - X-Frame-Options: DENY
//  - Permissions-Policy: camera/microphone/geolocation disabled (unused).
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' for Next.js' inline bootstrap scripts; 'unsafe-eval' only in
  // dev for React Refresh / HMR.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // 'self' covers the app's own API; ws: in dev for the HMR socket.
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

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
      output: "export",
      basePath: "/gun-laws",
      images: { unoptimized: true },
      trailingSlash: true,
      // No headers() in export mode — unsupported with `output: "export"`.
    }
  : {
      reactStrictMode: true,
      async headers() {
        return [
          {
            // Apply to all routes.
            source: "/:path*",
            headers: securityHeaders,
          },
        ];
      },
    };

export default nextConfig;
