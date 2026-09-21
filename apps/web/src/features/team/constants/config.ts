export const TEAM_SECTION_ID = "nguoi-ke-chuyen";

/**
 * Timing shared by every hover reaction inside a card (design.md §7.1: slow, soft, no
 * overshoot). Engaging takes 700ms; releasing takes 900ms, so it settles more slowly
 * than it lifted. Combine with an explicit `transition-[...]` property list.
 */
export const TEAM_HOVER_TIMING =
  "duration-[900ms] ease-gallery group-hover:duration-[700ms] group-focus-visible:duration-[700ms] motion-reduce:transition-none";

/** Small offsets between layers (figure 0ms) so the lift has depth without falling apart. */
export const TEAM_LAYER_DELAY = {
  art: "delay-[40ms]",
  rim: "delay-[60ms]",
  glow: "delay-[80ms]",
} as const;

/**
 * Neon strength per backdrop tone. Dark backdrops carry the full Emerald light; light
 * ones get roughly half of it in a deeper Emerald so it does not wash out. Every layer
 * fades in by opacity only. Full class names so Tailwind can see them.
 */
export const TEAM_NEON = {
  dark: {
    halo: "shadow-neon-emerald",
    rim: "border-neon-emerald",
    glowOn: "group-hover:opacity-100 group-focus-visible:opacity-100",
  },
  light: {
    halo: "shadow-neon-emerald-soft",
    rim: "border-neon-emerald-deep",
    glowOn: "group-hover:opacity-55 group-focus-visible:opacity-55",
  },
} as const;

/**
 * Staggered card layout per member (in order), so the grid reads like uneven
 * steps (design.md §4.2). `arch` is the arch height (shorter on md, where the columns are narrow); `tilt` is the hover lean of the
 * cutout (odd cards left, even cards right); `tone` is the backdrop brightness for the
 * neon. Full class names so Tailwind can see them.
 */
export const TEAM_CARD_STYLES = [
  {
    card: "",
    arch: "h-[320px] md:h-[230px] lg:h-[320px]",
    tilt: "motion-safe:group-hover:-rotate-[0.75deg] motion-safe:group-focus-visible:-rotate-[0.75deg]",
    tone: "dark",
  },
  {
    card: "md:mt-10",
    arch: "h-[290px] md:h-[210px] lg:h-[290px]",
    tilt: "motion-safe:group-hover:rotate-[0.75deg] motion-safe:group-focus-visible:rotate-[0.75deg]",
    tone: "light",
  },
  {
    card: "",
    arch: "h-[340px] md:h-[245px] lg:h-[340px]",
    tilt: "motion-safe:group-hover:-rotate-[0.75deg] motion-safe:group-focus-visible:-rotate-[0.75deg]",
    tone: "light",
  },
  {
    card: "md:mt-4",
    arch: "h-[280px] md:h-[200px] lg:h-[280px]",
    tilt: "motion-safe:group-hover:rotate-[0.75deg] motion-safe:group-focus-visible:rotate-[0.75deg]",
    tone: "light",
  },
  {
    card: "md:mt-12",
    arch: "h-[320px] md:h-[230px] lg:h-[320px]",
    tilt: "motion-safe:group-hover:-rotate-[0.75deg] motion-safe:group-focus-visible:-rotate-[0.75deg]",
    tone: "light",
  },
  {
    card: "md:mt-4",
    arch: "h-[290px] md:h-[210px] lg:h-[290px]",
    tilt: "motion-safe:group-hover:rotate-[0.75deg] motion-safe:group-focus-visible:rotate-[0.75deg]",
    tone: "dark",
  },
] as const;

/** Gradient behind the art of each backdrop. Full class names so Tailwind can see them. */
export const TEAM_BACKDROP_BG = {
  network: "bg-gradient-to-b from-deep-blue via-deep-blue to-emerald-brand/45",
  particles: "bg-gradient-to-b from-mint-mist to-emerald-brand/25",
  palette: "bg-gradient-to-b from-soft-white to-mint-mist",
  stairs: "bg-gradient-to-b from-mint-mist to-emerald-brand/40",
  story: "bg-paper",
  keyhole: "bg-gradient-to-b from-deep-blue to-charcoal",
} as const;

/** Backdrop art is drawn on this canvas and sliced to the arch. */
export const TEAM_BACKDROP_VIEWBOX = "0 0 400 340";

/** Cutout height as a percent of the arch: the extra is how far the head rises above it. */
export const CUTOUT_HEIGHT_PERCENT = 118;

/** How far the cutout extends below the arch (clipped) so a hover lift never shows its bottom edge. */
export const CUTOUT_BLEED_PX = 14;

/** Bottom corner radius of the grid photo arch (top corners are a half circle). */
export const GRID_PHOTO_BOTTOM_RADIUS = 0;

/** Corner radius of the portrait frame inside the open profile. */
export const PROFILE_FRAME_RADIUS = 36;

/** Shared easing for every profile transition. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Timings in seconds. Opening ≈ 1.4s (usable from ≈ 0.6s); closing ≈ 0.45s. */
export const OPEN_MOTION = {
  scrim: 0.45,
  frame: 0.65,
  stickerDelay: 0.35,
  stickerDuration: 0.4,
  textStart: 0.45,
  stagger: 0.07,
  item: 0.5,
  underlineDuration: 0.9,
  notesStart: 1.0,
  noteWrite: 0.6,
  noteArrow: 0.5,
  reduced: 0.2,
} as const;

export const CLOSE_MOTION = {
  content: 0.15,
  frameDelay: 0.1,
  frame: 0.35,
  scrim: 0.45,
} as const;
