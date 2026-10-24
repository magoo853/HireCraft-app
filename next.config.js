/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No next/image usage anywhere in the app, so disable the Image
  // Optimization API outright (security pass 2026-10-21): it removes the
  // whole optimizer attack surface (e.g. the AVIF/libheif RCE family,
  // GHSA-2xp9-vwfh-vxw4) instead of leaving an unused endpoint live.
  images: { unoptimized: true },
  webpack: (config) => {
    // pdfjs-dist needs the DOM canvas; keep it client-side only.
    config.resolve.alias.canvas = false;
    return config;
  },
  experimental: {
    // The /pdf-worker route handler reads the pdf.js worker out of
    // node_modules; make sure it is traced into that route's bundle.
    outputFileTracingIncludes: {
      "/pdf-worker": ["./node_modules/pdfjs-dist/build/pdf.worker.min.mjs"],
    },
  },
  // Security headers on every route: the Cycle 1 baseline plus a
  // Content-Security-Policy (Cycle 3). The CSP allows exactly what the
  // client actually uses, from a full origin audit of app/, lib/ and
  // components/: every client fetch is same-origin (/api/*); the pdf.js
  // worker is served same-origin from /pdf-worker, with jsDelivr kept
  // in worker-src as a fallback; there are no external fonts, images,
  // or scripts.
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
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
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
