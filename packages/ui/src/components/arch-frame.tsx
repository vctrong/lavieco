import type { HTMLAttributes } from "react";

import { cn } from "../lib/cn";

const RADII = {
  full: "rounded-t-full rounded-b-2xl",
  arch: "rounded-arch",
  "arch-sm": "rounded-arch-sm",
  "arch-lg": "rounded-arch-lg",
} as const;

type ArchFrameProps = HTMLAttributes<HTMLDivElement> & {
  radius?: keyof typeof RADII;
  /** Inner mat-board (an inset arch around the content). */
  mat?: boolean;
};

/** Arch-shaped frame ("portal"). `mat` adds the inner mat-board layer. */
export function ArchFrame({
  radius = "full",
  mat = false,
  className,
  children,
  ...rest
}: ArchFrameProps) {
  return (
    <div className={cn("relative overflow-hidden", RADII[radius], className)} {...rest}>
      {mat ? (
        <div className="size-full overflow-hidden rounded-arch-mat">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
