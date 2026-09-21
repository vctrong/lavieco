import { ArchFrame, ConcentricRings, NestedShapes, PearlDot, WaveLines, cn } from "@lavieco/ui";

import { JOURNEY_STAGE_STYLES } from "../constants/config";
import { TEXT } from "../constants/text";
import { MiniQr } from "./illustrations/mini-qr";

type Stage = (typeof TEXT.vi.journey.stages)[number];
type PlainStage = Extract<Stage, { visualKicker: string }>;
type FinalStage = Extract<Stage, { qrTitle: string }>;

const WATERMARK_CLASS =
  "pointer-events-none absolute -left-3 -top-8 select-none font-display text-[104px] font-light leading-none";

function StageIllustration({ index }: { index: number }) {
  if (index === 0) {
    return <ConcentricRings radii={[40, 70, 100, 130]} className="text-deep-blue opacity-15" />;
  }
  if (index === 1) {
    return <WaveLines offsets={[40, 90, 140, 190]} className="text-emerald-brand opacity-15" />;
  }
  return <NestedShapes shape="rect" className="text-deep-blue opacity-15" />;
}

/** Stages 01–03: a light arch card with a placeholder visual and a caption. */
export function JourneyStage({ stage, index }: { stage: PlainStage; index: number }) {
  const style = JOURNEY_STAGE_STYLES[index] ?? JOURNEY_STAGE_STYLES[0];
  const phase = TEXT.vi.journey.phaseLabel;

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
          <StageIllustration index={index} />
          <div className="z-10 text-center">
            <PearlDot size="md" tone={index === 1 ? "emerald" : "canary"} className="mb-1.5" />
            <span className="block font-mono text-[9.5px] uppercase tracking-museum text-deep-blue/70">
              {stage.visualKicker}
            </span>
            <p className="font-display text-xs italic text-deep-blue">{stage.visualCaption}</p>
          </div>
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded border border-hairline bg-soft-white/95 px-2 py-1 text-[9.5px] text-deep-blue">
            <span className="font-medium">{stage.tag}</span>
            <span className="font-bold text-emerald-brand">{stage.metric}</span>
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

/** Stage 04, the destination: a dark card with the story card and QR. */
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
        <div className="relative flex min-h-24 w-full flex-1 flex-col items-center justify-between overflow-hidden rounded-t-full rounded-b-xl border border-soft-white/10 bg-gradient-to-b from-deep-blue via-deep-blue to-emerald-brand/30 p-3">
          <ConcentricRings radii={[45, 80, 115]} cy="50%" className="text-canary opacity-20" />
          <div className="z-10 flex w-full items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-museum text-canary">
              {stage.storyCardLabel}
            </span>
            <PearlDot size="md" tone="canary" motion="pulse" />
          </div>
          <div className="z-10 my-auto text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl border border-soft-white/20 bg-soft-white/15 p-2 text-canary backdrop-blur-md">
              <MiniQr label={stage.qrLabel} />
            </div>
            <p className="font-display text-xs italic text-soft-white">{stage.qrTitle}</p>
            <span className="font-mono text-[9px] text-mint-mist/70">{stage.qrNote}</span>
          </div>
          <div className="z-10 w-full rounded-lg border border-paper-edge bg-paper p-2.5 text-left text-deep-blue shadow-md">
            <div className="mb-1 flex items-center justify-between font-mono text-[8.5px]">
              <span className="font-bold text-emerald-brand">{stage.cardId}</span>
              <span className="text-charcoal/60">{stage.cardWeight}</span>
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
