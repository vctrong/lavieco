import type { ReactNode } from "react";

import { cn } from "../lib/cn";

const RATIOS = {
  /** Grids, cart lines, admin thumbnails. */
  square: "aspect-square",
  /** Product gallery. */
  portrait: "aspect-[4/5]",
} as const;

export type ProductFrameRatio = keyof typeof RATIOS;

/**
 * Frame of every product image (docs/08 §6.1): square or 4:5, one rounded corner for
 * web and admin alike. Never the arch (`ArchFrame`, `--radius-arch*`): products are
 * evidence, not gallery pieces (BR-01). The image inside fills it with `object-cover`;
 * the mint background shows while it loads.
 */
export function ProductFrame({
  ratio = "square",
  className,
  children,
}: {
  ratio?: ProductFrameRatio;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-pedestal bg-mint-mist [&_img]:object-cover",
        RATIOS[ratio],
        className,
      )}
    >
      {children}
    </div>
  );
}
