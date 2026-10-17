import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lavieco/ui"],
  serverExternalPackages: ["pino"],
  poweredByHeader: false,
};

export default nextConfig;
