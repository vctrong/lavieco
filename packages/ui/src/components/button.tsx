import type { ComponentPropsWithoutRef, ElementType } from "react";

import { cn } from "../lib/cn";

/**
 * The primary label is Charcoal on Emerald (5.3:1): Deep Blue on Emerald is only 4.45:1,
 * under WCAG AA for the 14 px labels of these buttons.
 */
const VARIANTS = {
  primary:
    "bg-emerald-brand text-charcoal font-bold shadow-emerald-cta hover:bg-emerald-brand/90 hover:scale-[1.02] active:scale-[0.98]",
  deep: "bg-deep-blue text-soft-white font-semibold shadow-md hover:bg-deep-blue/90 hover:scale-[1.02] active:scale-[0.98]",
  secondary:
    "border border-deep-blue/25 text-deep-blue font-semibold hover:bg-mint-mist hover:border-emerald-brand",
  link: "min-h-11 justify-start py-2 text-left text-deep-blue font-medium hover:text-emerald-brand",
} as const;

const SIZES = {
  md: "px-7 py-3.5 text-sm",
  sm: "px-4 py-1.5 text-[12.5px] shadow-emerald-cta-sm",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

type ButtonOwnProps<T extends ElementType> = {
  as?: T;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export type ButtonProps<T extends ElementType> = ButtonOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof ButtonOwnProps<T>>;

/** Pill button. Pass `as={Link}` (or "a") to render a navigation element. */
export function Button<T extends ElementType = "button">({
  as,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ButtonProps<T>) {
  const Component: ElementType = as ?? "button";
  return (
    <Component
      // Lets an app adjust one size in its own layout (admin: 44 px touch targets).
      data-size={variant === "link" ? undefined : size}
      className={cn(
        "group inline-flex items-center gap-2 transition-all duration-300",
        // `cn` only joins classes, it does not resolve conflicts: a text link must not
        // also get the pill's padding and centring (it indented and split on phones).
        variant === "link" ? null : cn("justify-center rounded-full", SIZES[size]),
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}
