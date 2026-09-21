import { cn } from "@lavieco/ui";

type UtilityTitleProps = {
  lead: string;
  emphasis: string;
  /** Lifts the italic to the Emerald accent; without it the emphasis keeps the ink colour. */
  accent?: boolean;
  className?: string;
};

/** The page `<h1>`: Fraunces, with one italic word or phrase. */
export function UtilityTitle({ lead, emphasis, accent = false, className }: UtilityTitleProps) {
  return (
    <h1
      className={cn(
        "font-display text-[2rem] leading-[1.2] font-light tracking-tight text-charcoal text-balance md:text-5xl md:leading-[1.2]",
        className,
      )}
    >
      {lead}
      <em className={cn("font-normal italic", accent && "text-emerald-brand")}>{emphasis}</em>
    </h1>
  );
}
