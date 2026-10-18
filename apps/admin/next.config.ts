import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for the production image (apps/admin/Dockerfile).
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@lavieco/ui"],
  serverExternalPackages: ["pino"],
  poweredByHeader: false,
};

export default nextConfig;
