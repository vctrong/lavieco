import type { HandbookChapterTint } from "@lavieco/shared/content";

export const COVER_HREF = "/cam-nang";
export const READER_HREF = "/cam-nang/doc";
/** A page number, or a cover ("bia", "bia-sau"). */
export const readerHref = (location: number | string) => `${READER_HREF}?trang=${location}`;
export const pageHref = (key: string) => `/cam-nang/trang/${key}`;

/** "Làm tiếp" cards on the cover. */
export const MORE_LINKS = {
  kit: "/bo-suu-tap",
  agent: "/laviagent",
  workshop: "/chuong-trinh",
} as const;

/** Tab colour of a chapter at the edge of the book, from design tokens only. */
export const TINT_CLASS: Record<HandbookChapterTint, string> = {
  mint: "bg-mint-mist text-deep-blue",
  canary: "bg-canary text-charcoal",
  paper: "bg-paper text-charcoal",
  emerald: "bg-emerald-brand text-charcoal",
  "deep-blue": "bg-deep-blue text-soft-white",
};

/** Page-turn duration; reduced motion uses a short crossfade instead. */
export const FLIP_MS = 620;
export const FADE_MS = 180;
