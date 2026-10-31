import type { NextConfig } from "next";

const BACKEND = process.env.BACKEND_URL ?? "http://backend:3000";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone", // NEW: small image for Docker
  poweredByHeader: false, // NEW

  // NEW: browser calls /api/... on the frontend, Next.js passes it to the backend
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND}/:path*` }];
  },

  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;