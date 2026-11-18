import type { HandbookChapterTint } from "@lavieco/shared/content";

/** Tab colour of a chapter, from design tokens only. */
export const TINT_CLASS: Record<HandbookChapterTint, string> = {
  mint: "bg-mint-mist text-deep-blue",
  canary: "bg-canary text-charcoal",
  paper: "bg-paper text-charcoal",
  emerald: "bg-emerald-brand text-charcoal",
  "deep-blue": "bg-deep-blue text-soft-white",
};

/** Small dot of the same colour, beside a chapter title. */
export const TINT_DOT: Record<HandbookChapterTint, string> = {
  mint: "bg-mint-mist ring-1 ring-hairline",
  canary: "bg-canary",
  paper: "bg-paper ring-1 ring-hairline",
  emerald: "bg-emerald-brand",
  "deep-blue": "bg-deep-blue",
};
