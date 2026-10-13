/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs-dist needs the DOM canvas; keep it client-side only.
    config.resolve.alias.canvas = false;
    return config;
  },
  // Conservative security-headers baseline on every route.
  // No Content-Security-Policy yet: the app loads a pdf.js worker from
  // jsDelivr and uses inline styles, so a CSP needs its own careful cycle.
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
        ],
      },
    ];
  },
};

module.exports = nextConfig;
