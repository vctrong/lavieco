import Image from "next/image";

import { ArchFrame, PearlDot, cn } from "@lavieco/ui";

import { JOURNEY_STAGE_IMAGES, JOURNEY_STAGE_STYLES } from "../constants/config";
import { TEXT } from "../constants/text";

type Stage = (typeof TEXT.vi.journey.stages)[number];
type PlainStage = Extract<Stage, { metric: string }>;
type FinalStage = Extract<Stage, { cardQuote: string }>;

const WATERMARK_CLASS =
  "pointer-events-none absolute -left-3 -top-8 select-none font-display text-[104px] font-light leading-none";
const IMAGE_SIZES = "(min-width: 1024px) 22vw, (min-width: 768px) 45vw, 90vw";
const FINAL_STAGE_INDEX = 3;

/** Stages 01–03: a light arch card with a photo and a caption. */
export function JourneyStage({ stage, index }: { stage: PlainStage; index: number }) {
  const style = JOURNEY_STAGE_STYLES[index] ?? JOURNEY_STAGE_STYLES[0];
  const phase = TEXT.vi.journey.phaseLabel;
  const image = JOURNEY_STAGE_IMAGES[index] ?? JOURNEY_STAGE_IMAGES[0];

  return (
    <div className="group relative flex flex-col justify-end">
      <div aria-hidden="true" className={cn(WATERMARK_CLASS, "text-deep-blue/15")}>
        {stage.number}
      </div>
      <ArchFrame
        data-cursor="view"
        className={cn(
          "relative z-10 flex w-full flex-col gap-1 border bg-soft-white/90 p-3 backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-2",
          style.card,
        )}
      >
        <div
          className={cn(
            "relative flex min-h-24 w-full items-center justify-center overflow-hidden rounded-t-full rounded-b-xl bg-gradient-to-b",
            style.visual,
          )}
        >
          <Image
            src={image}
            alt={stage.imageAlt}
            fill
            sizes={IMAGE_SIZES}
            className="object-cover"
          />
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded border border-hairline bg-soft-white/95 px-2 py-1 text-[9.5px] text-deep-blue">
            <span className="shrink-0 font-medium">{stage.tag}</span>
            {/* Four narrow columns (lg) leave no room for both: it would cover the photo. */}
            <span className="hidden text-right font-bold text-emerald-brand max-md:inline xl:inline">
              {stage.metric}
            </span>
          </div>
        </div>
        <div className="p-2">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-museum text-charcoal/50">
            {phase} {stage.number}
          </div>
          <h3 className="font-display text-lg font-medium leading-snug text-deep-blue">
            {stage.title}
          </h3>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-charcoal/80">
            {stage.description}
          </p>
        </div>
      </ArchFrame>
    </div>
  );
}

/** Stage 04, the destination: a dark card with the story card photo and its quote. */
export function JourneyFinalStage({ stage }: { stage: FinalStage }) {
  return (
    <div className="group relative flex flex-col justify-end">
      <div aria-hidden="true" className={cn(WATERMARK_CLASS, "text-canary/20")}>
        {stage.number}
      </div>
      <ArchFrame
        data-cursor="view"
        className="relative z-10 flex h-[var(--journey-h)] w-full flex-col gap-1 border border-canary/40 bg-deep-blue p-3.5 text-soft-white shadow-2xl transition-transform duration-300 group-hover:-translate-y-2"
      >
        <div className="relative flex min-h-24 w-full flex-1 flex-col items-center justify-between overflow-hidden rounded-t-full rounded-b-xl border border-soft-white/10 bg-deep-blue p-3">
          <Image
            src={JOURNEY_STAGE_IMAGES[FINAL_STAGE_INDEX]}
            alt={stage.imageAlt}
            fill
            sizes={IMAGE_SIZES}
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-deep-blue/70 via-transparent to-deep-blue/40"
          />
          {/* Centered: the arch's curve would clip anything at the corners of this row. */}
          <div className="z-10 mt-2 flex items-center justify-center gap-1.5">
            <PearlDot size="md" tone="canary" motion="pulse" />
            <span className="font-mono text-[9px] uppercase tracking-museum text-canary">
              {stage.storyCardLabel}
            </span>
          </div>
          <div className="z-10 w-full rounded-lg border border-paper-edge bg-paper p-2.5 text-left text-deep-blue shadow-md">
            <div className="mb-1 hidden items-center justify-between font-mono text-[8.5px] max-md:flex xl:flex">
              <span className="font-bold text-emerald-brand">{stage.cardId}</span>
              <span className="text-charcoal/60">{stage.cardNote}</span>
            </div>
            <p className="font-display text-[10.5px] font-medium leading-snug">{stage.cardQuote}</p>
          </div>
        </div>
        <div className="p-2 pt-3">
          <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-museum text-canary">
            <PearlDot size="sm" />
            <span>{stage.phaseNote}</span>
          </div>
          <h3 className="font-display text-lg font-medium leading-snug text-soft-white">
            {stage.title}
          </h3>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-mint-mist/80">
            {stage.description}
          </p>
        </div>
      </ArchFrame>
    </div>
  );
}
