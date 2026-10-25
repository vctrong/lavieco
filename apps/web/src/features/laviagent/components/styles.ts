/** Class lists shared by the LaviAgent screens. */

/** Fixed bar at the bottom of phone screens (thumb zone), above the home indicator. */
export const BOTTOM_BAR =
  "fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-soft-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md";

/** Bottom-bar buttons: 48px tall, tight padding so two fit side by side at 360px. */
export const BAR_BUTTON =
  "inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-full px-3 text-center text-sm leading-tight transition-transform active:scale-[0.98]";

export const BAR_PRIMARY = "bg-emerald-brand font-bold text-charcoal shadow-emerald-cta";
export const BAR_SECONDARY =
  "border border-deep-blue/25 bg-soft-white font-semibold text-deep-blue";
