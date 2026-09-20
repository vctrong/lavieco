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
