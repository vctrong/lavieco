import type { CSSProperties } from "react";

import { cn } from "@lavieco/ui";

type SparkleProps = {
  className?: string;
  style?: CSSProperties;
};

/**
 * A four-point star with sharp, concave sides. Purely decorative (a graphic, not an icon),
 * so it is hidden from assistive tech; it takes its colour from `currentColor`.
 */
export function Sparkle({ className, style }: SparkleProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={cn("block size-full", className)}
      style={style}
    >
      <path
        d="M12 0C12.7 7.6 16.4 11.3 24 12C16.4 12.7 12.7 16.4 12 24C11.3 16.4 7.6 12.7 0 12C7.6 11.3 11.3 7.6 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
