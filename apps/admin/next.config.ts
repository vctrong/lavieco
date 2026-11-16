import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for the production image (apps/admin/Dockerfile).
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@lavieco/ui"],
  serverExternalPackages: ["pino"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        // The browser must always check for a new worker (docs/PWA.md).
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
