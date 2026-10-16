import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @lavieco/ui ships TypeScript source (consumed only by Next apps in stage 1).
  transpilePackages: ["@lavieco/ui"],
  // pino spawns worker threads; it must stay a plain Node dependency on the server.
  serverExternalPackages: ["pino"],
};

export default nextConfig;
