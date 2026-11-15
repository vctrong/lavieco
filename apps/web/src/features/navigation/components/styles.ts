/** Class lists shared by the bar's links, dropdown triggers and floating panels. */

export const NAV_LINK_CLASS =
  "relative inline-flex items-center whitespace-nowrap rounded-full py-1 text-sm font-medium text-charcoal/80 transition-colors hover:text-emerald-brand";

export const MENU_PANEL_CLASS =
  "absolute top-[calc(100%+0.75rem)] z-50 rounded-2xl border border-mint-mist bg-soft-white p-3 text-charcoal shadow-float-dock";

/** One row of the account menu. */
export const MENU_ROW_CLASS =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-charcoal/85 transition-colors hover:bg-mint-mist/50 hover:text-emerald-brand focus-visible:bg-mint-mist/50";

/**
 * The navbar's round 32px icon buttons keep their size in the compact bar, but their
 * touch area grows to 44px with an invisible ring around them (WCAG 2.5.8, thumbs).
 */
export const ICON_HIT_AREA_CLASS = "relative after:absolute after:-inset-1.5 after:content-['']";
