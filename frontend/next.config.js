/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone build emits a self-contained server bundle under .next/standalone,
  // which is what frontend/Dockerfile copies into the final image.
  output: "standalone",
  experimental: {
    typedRoutes: false,
  },
};

module.exports = nextConfig;
