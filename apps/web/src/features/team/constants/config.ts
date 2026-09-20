export const TEAM_SECTION_ID = "nguoi-ke-chuyen";

/**
 * Staggered card and photo heights per member (in order), so the grid reads
 * like uneven steps (design.md §4.2). Full class names so Tailwind can see them.
 */
export const TEAM_CARD_STYLES = [
  { card: "h-[420px]", photo: "h-[280px]" },
  { card: "h-[370px] md:mt-10", photo: "h-[240px]" },
  { card: "h-[430px]", photo: "h-[290px]" },
  { card: "h-[350px] md:mt-4", photo: "h-[220px]" },
  { card: "h-[410px] md:mt-12", photo: "h-[270px]" },
  { card: "h-[360px] md:mt-4", photo: "h-[230px]" },
] as const;

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
  lastNameExtraDelay: 0.08,
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
