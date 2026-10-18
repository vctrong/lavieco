import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for the production image (apps/web/Dockerfile). Tracing starts
  // at the monorepo root so the workspace packages end up in the bundle.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // @lavieco/ui ships TypeScript source (consumed only by Next apps in stage 1).
  transpilePackages: ["@lavieco/ui"],
  // pino spawns worker threads; it must stay a plain Node dependency on the server.
  serverExternalPackages: ["pino"],
};

export default nextConfig;
