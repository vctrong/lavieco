import type { MetadataRoute } from "next";

import { PWA_COLORS, PWA_PATHS } from "./app";
import { TEXT } from "./text";

/**
 * Web app manifest of the back office (docs/PWA.md). Admin has its own host, so the
 * app covers the whole origin: `scope` "/" never reaches the public site.
 */
export function adminManifest(): MetadataRoute.Manifest {
  const t = TEXT.vi.manifest;
  return {
    id: "/",
    name: t.name,
    short_name: t.shortName,
    description: t.description,
    lang: "vi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: PWA_COLORS.theme,
    background_color: PWA_COLORS.background,
    icons: [
      { src: PWA_PATHS.icons.any192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: PWA_PATHS.icons.any512, sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: PWA_PATHS.icons.maskable512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: t.shortcuts.checkin,
        url: "/checkin",
        icons: [{ src: PWA_PATHS.icons.any192, sizes: "192x192" }],
      },
      {
        name: t.shortcuts.orders,
        url: "/orders",
        icons: [{ src: PWA_PATHS.icons.any192, sizes: "192x192" }],
      },
    ],
  };
}
