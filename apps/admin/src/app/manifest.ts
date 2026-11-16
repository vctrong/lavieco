import type { MetadataRoute } from "next";

import { adminManifest } from "@/features/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return adminManifest();
}
