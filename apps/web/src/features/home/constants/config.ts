/** Anchor ids of the home sections (also targets of navigation links). */
export const SECTION_IDS = {
  hero: "hero",
  journey: "tu-vo-den-tac-pham",
  programs: "bon-nac-thang",
  collection: "bang-chung",
  impact: "tac-dong",
  team: "nguoi-ke-chuyen",
  contact: "lien-he",
} as const;

/**
 * Sequences repeated inside each half of the hero ticker. One sequence is
 * roughly 1900px wide; each half must cover the widest viewport (2560px).
 */
export const MARQUEE_REPEAT = 2;
