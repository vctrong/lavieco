import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @lavieco/ui ships TypeScript source (consumed only by Next apps in stage 1).
  transpilePackages: ["@lavieco/ui"],
};

export default nextConfig;
