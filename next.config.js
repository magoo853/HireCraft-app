/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs-dist needs the DOM canvas; keep it client-side only.
    config.resolve.alias.canvas = false;
    return config;
  },
  // Security headers on every route: the Cycle 1 baseline plus a
  // Content-Security-Policy (Cycle 3). The CSP allows exactly what the
  // client actually uses, from a full origin audit of app/, lib/ and
  // components/: every client fetch is same-origin (/api/*); the only
  // external load is the pdf.js worker from jsDelivr (with a same-origin
  // fallback file); there are no external fonts, images, or scripts.
  // 'unsafe-inline' for scripts is required because the Next.js App Router
  // injects inline bootstrap scripts; moving to nonce-based script-src
  // needs middleware and is a separate future tightening.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob: https://cdn.jsdelivr.net; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
