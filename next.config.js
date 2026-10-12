/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs-dist needs the DOM canvas; keep it client-side only.
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
