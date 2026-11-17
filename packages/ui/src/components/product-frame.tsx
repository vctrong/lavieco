import type { ReactNode } from "react";

import { cn } from "../lib/cn";

const RATIOS = {
  /** Grids, cart lines, admin thumbnails. */
  square: "aspect-square",
  /** Product gallery, when the cover is a portrait photo. */
  portrait: "aspect-[4/5]",
} as const;

export type ProductFrameRatio = keyof typeof RATIOS;

/**
 * The frame that shows an image of this size without cutting it: 4:5 for a clearly
 * portrait image (taller than about 9:10), square for everything else.
 */
export function productFrameRatioOf(width: number, height: number): ProductFrameRatio {
  return width > 0 && height / width >= 1.1 ? "portrait" : "square";
}

/**
 * Frame of every product image (docs/08 §6.1): square or 4:5, one rounded corner for
 * web and admin alike. Never the arch (`ArchFrame`, `--radius-arch*`): products are
 * evidence, not gallery pieces (BR-01). `cover` fills the frame (grids, thumbnails);
 * `contain` shows the whole image with the mint background around it, for the product
 * gallery where a designed image (logo, text near the edges) must not be cropped.
 */
export function ProductFrame({
  ratio = "square",
  fit = "cover",
  className,
  children,
}: {
  ratio?: ProductFrameRatio;
  fit?: "cover" | "contain";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-pedestal bg-mint-mist",
        fit === "cover" ? "[&_img]:object-cover" : "[&_img]:object-contain",
        RATIOS[ratio],
        className,
      )}
    >
      {children}
    </div>
  );
}
