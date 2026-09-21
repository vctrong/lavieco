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

/** Shared easing for every profile transition (same curve as `--ease-gallery`). */
export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Profile panel size. Height is definite (so the two columns can share it) and never
 * exceeds the viewport minus a 1rem margin on each side; `svh` so mobile browser bars
 * do not push it off screen.
 */
export const PROFILE_PANEL_SIZE =
  "h-[min(calc(100svh-2rem),50rem)] w-[min(calc(100vw-2rem),76rem)]";

/**
 * Type and spacing of the profile scale with the height of the text column (`cqh`, a
 * container query unit), so the whole profile fits without scrolling wherever it can. Full class names for Tailwind.
 */
export const PROFILE_SCALE = {
  pad: "p-[clamp(1rem,3.4cqh,2.5rem)]",
  gap: "gap-[clamp(0.5rem,1.9cqh,1.25rem)]",
  kicker: "text-[clamp(0.6rem,1.4cqh,0.8rem)]",
  name: "text-[clamp(1.6rem,5.4cqh,3.6rem)]",
  role: "text-[clamp(0.6rem,1.4cqh,0.8rem)]",
  quote: "text-[clamp(1rem,2.9cqh,1.9rem)]",
  body: "text-[clamp(0.75rem,1.8cqh,1rem)]",
  story: "text-[clamp(0.75rem,1.8cqh,1.05rem)]",
  label: "text-[clamp(0.55rem,1.25cqh,0.7rem)]",
  chip: "text-[clamp(0.65rem,1.45cqh,0.8rem)]",
  note: "text-[clamp(0.85rem,2.1cqh,1.15rem)]",
} as const;

/** Timings in seconds. Opening ≈ 1s (usable from ≈ 0.4s); closing 0.5s. */
export const OPEN_MOTION = {
  scrim: 0.5,
  panel: 0.7,
  textStart: 0.25,
  stagger: 0.06,
  item: 0.5,
  underlineDuration: 0.8,
  notesStart: 0.7,
  noteWrite: 0.6,
  noteArrow: 0.5,
  reduced: 0.2,
} as const;

export const CLOSE_MOTION = {
  content: 0.15,
  panel: 0.5,
  scrim: 0.5,
} as const;
