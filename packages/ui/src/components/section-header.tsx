import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { Eyebrow } from "./eyebrow";

type SectionHeaderProps = {
  kicker: string;
  title: string;
  /** Right-aligned aside (short paragraph). */
  children?: ReactNode;
  tone?: "light" | "dark";
  className?: string;
};

/** Section title block: kicker, h2 and an optional aside, separated by a hairline. */
export function SectionHeader({
  kicker,
  title,
  children,
  tone = "light",
  className,
}: SectionHeaderProps) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "flex flex-col justify-between border-b pb-6 md:flex-row md:items-end",
        dark ? "border-hairline-light pb-8" : "border-hairline",
        className,
      )}
    >
      <div>
        <Eyebrow tone={dark ? "mint" : "emerald"} className="mb-2">
          {kicker}
        </Eyebrow>
        <h2
          className={cn(
            "font-display text-4xl font-light tracking-tight md:text-6xl",
            dark ? "text-soft-white" : "text-deep-blue",
          )}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
