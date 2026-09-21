/** Anchor ids of the home sections (also targets of navigation links). */
export const SECTION_IDS = {
  hero: "hero",
  journey: "tu-vo-den-tac-pham",
  programs: "bon-nac-thang",
  collection: "bang-chung",
  impact: "tac-dong",
  contact: "lien-he",
} as const;

/** Internal routes the home sections link to. */
export const ROUTES = {
  collection: "/bo-suu-tap",
  handbook: "/cam-nang",
  programs: "/chuong-trinh",
} as const;

/**
 * Sequences repeated inside each half of the hero ticker. One sequence is
 * roughly 2000px wide; each half must cover the widest viewport (2560px).
 */
export const MARQUEE_REPEAT = 2;

/**
 * Per-stage look of "Từ vỏ đến tác phẩm": card heights rise like a tide
 * (88% → 100% of `--journey-h`, which follows the viewport height so the section fits one
 * screen). Full class names are listed so Tailwind can see them.
 */
export const JOURNEY_STAGE_STYLES = [
  {
    card: "h-[calc(var(--journey-h)*0.88)] border-hairline shadow-md",
    visual: "flex-1 from-mint-mist to-soft-white",
    tone: "text-deep-blue",
  },
  {
    card: "h-[calc(var(--journey-h)*0.92)] border-hairline shadow-lg",
    visual: "flex-1 from-mint-mist via-mint-mist to-emerald-brand/20",
    tone: "text-emerald-brand",
  },
  {
    card: "h-[calc(var(--journey-h)*0.96)] border-emerald-brand/30 shadow-xl",
    visual: "flex-1 from-mint-mist via-soft-white to-emerald-brand/25",
    tone: "text-deep-blue",
  },
] as const;

/** "Bốn nấc thang": min-heights climb like steps. */
export const PROGRAM_LEVEL_STYLES = [
  {
    card: "min-h-[380px] bg-mint-mist/60 border-hairline shadow-sm hover:shadow-lg",
    number: "bg-emerald-brand text-deep-blue",
    tag: "bg-soft-white text-emerald-brand border border-hairline font-semibold",
    title: "text-deep-blue",
    body: "text-charcoal/75",
    foot: "border-hairline",
    footLabel: "text-charcoal/60",
    footText: "text-deep-blue",
  },
  {
    card: "min-h-[420px] bg-mint-mist/90 border-hairline shadow-sm hover:shadow-lg",
    number: "bg-emerald-brand text-deep-blue",
    tag: "bg-deep-blue text-soft-white font-medium",
    title: "text-deep-blue",
    body: "text-charcoal/75",
    foot: "border-hairline",
    footLabel: "text-charcoal/60",
    footText: "text-deep-blue",
  },
  {
    card: "min-h-[460px] bg-soft-white border-2 border-emerald-brand/40 shadow-md hover:shadow-xl",
    number: "bg-deep-blue text-canary",
    tag: "bg-emerald-brand text-deep-blue font-bold",
    title: "text-deep-blue",
    body: "text-charcoal/75",
    foot: "border-hairline",
    footLabel: "text-charcoal/60",
    footText: "text-deep-blue",
  },
  {
    card: "min-h-[500px] bg-deep-blue text-soft-white border-hairline shadow-xl",
    number: "bg-canary text-deep-blue",
    tag: "bg-soft-white/15 text-canary border border-soft-white/20 font-semibold",
    title: "text-soft-white",
    body: "text-mint-mist/80",
    foot: "border-hairline-light",
    footLabel: "text-canary/80",
    footText: "text-soft-white",
  },
] as const;

/** Collection cards: arch heights, tilt of the story card behind, and visuals. */
export const COLLECTION_CARD_STYLES = [
  {
    arch: "h-[420px] border-hairline shadow-lg hover:shadow-xl",
    visual: "h-[260px] to-emerald-brand/25",
    story: "-right-3 -top-4 w-44 rotate-[6deg] group-hover:rotate-[12deg]",
    rings: [50, 90, 130, 170],
  },
  {
    arch: "h-[500px] border-2 border-emerald-brand/40 shadow-xl hover:shadow-2xl",
    visual: "h-[340px] to-emerald-brand/30",
    story: "-left-3 -top-6 w-48 rotate-[-7deg] group-hover:rotate-[-12deg]",
    rings: [40, 80, 120],
  },
  {
    arch: "h-[460px] border-hairline shadow-lg hover:shadow-xl",
    visual: "h-[300px] to-deep-blue/20",
    story: "-right-3 -top-5 w-52 rotate-[5deg] group-hover:rotate-[10deg]",
    rings: [60, 100, 140],
  },
] as const;

/** Roadmap: three waves of rising height. */
export const ROADMAP_PHASE_STYLES = [
  {
    wave: "h-[140px] rounded-t-[48px] bg-emerald-brand text-deep-blue shadow-lg",
    waveLabel: "text-soft-white",
    status: "bg-emerald-brand/15 text-emerald-brand",
  },
  {
    wave: "h-[220px] rounded-t-[56px] border-2 border-emerald-brand bg-mint-mist text-deep-blue shadow-lg",
    waveLabel: "text-emerald-brand",
    status: "bg-deep-blue/10 text-deep-blue",
  },
  {
    wave: "h-[300px] rounded-t-[64px] border-2 border-dashed border-emerald-brand bg-mint-mist/20 text-deep-blue",
    waveLabel: "text-charcoal/70",
    status: "bg-soft-white border border-hairline text-charcoal/60",
  },
] as const;
