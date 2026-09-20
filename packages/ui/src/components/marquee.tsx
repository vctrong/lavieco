import { Children, type ReactNode } from "react";

import { cn } from "../lib/cn";

type MarqueeProps = {
  /** One sequence of items. Each item spaces itself with its own padding (no `gap`). */
  children: ReactNode;
  /** Sequences per half; each half must be at least as wide as the widest viewport. */
  repeat?: number;
  /** CSS time value, e.g. "32s". */
  duration?: string;
  className?: string;
};

/**
 * Seamless horizontal ticker, pure CSS (server component).
 *
 * Two identical halves; the track slides by -50%. The whole track is aria-hidden:
 * the caller provides a single `sr-only` copy of the text for screen readers.
 * Pauses on hover/focus; under prefers-reduced-motion it stops and shows one
 * complete, wrapped sequence.
 */
export function Marquee({ children, repeat = 4, duration, className }: MarqueeProps) {
  const sequences = Array.from({ length: repeat }, (_, index) => index);
  const items = Children.toArray(children);

  const half = (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center motion-reduce:flex-wrap motion-reduce:justify-center"
    >
      {sequences.map((index) => (
        <div
          key={index}
          className={cn("flex shrink-0 items-center", index > 0 && "motion-reduce:hidden")}
        >
          {items}
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn("group/marquee overflow-hidden", className)}>
      <div
        className="flex w-max animate-marquee items-center whitespace-nowrap will-change-transform group-focus-within/marquee:[animation-play-state:paused] group-hover/marquee:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none motion-reduce:justify-center"
        style={duration ? { animationDuration: duration } : undefined}
      >
        {half}
        <div className="contents motion-reduce:hidden">{half}</div>
      </div>
    </div>
  );
}
