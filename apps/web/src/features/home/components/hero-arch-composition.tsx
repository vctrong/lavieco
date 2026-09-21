import { ArchFrame, ConcentricRings, NestedShapes, PearlDot, WaveLines } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { MiniQr } from "./illustrations/mini-qr";

/**
 * Three overlapping arches plus a tilted story card (design.md §9.2 #1).
 * Placeholder gradients and line-art; real photography comes later.
 */
export function HeroArchComposition() {
  const arches = TEXT.vi.heroArches;
  const card = TEXT.vi.storyCard;

  return (
    // The whole cluster is authored on a fixed 460x560 canvas and scaled as one unit
    // to the width of its column (container query units), so arches, cards and labels
    // never drift apart. The width is also capped by viewport height (svh).
    <div className="@container relative mx-auto aspect-[460/560] w-[min(100%,460px)] lg:ml-auto lg:mr-0 lg:w-[min(100%,calc(62svh*46/56))]">
      <div
        className="absolute left-0 top-0 h-[560px] w-[460px] origin-top-left"
        style={{ scale: "tan(atan2(100cqw, 460px))" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 size-96 rounded-full bg-mint-mist/80 blur-3xl"
        />
        <ArchFrame
          data-cursor="view"
          className="group absolute right-0 top-0 z-10 h-[520px] w-[340px] border border-emerald-brand/30 bg-gradient-to-b from-mint-mist via-mint-mist to-emerald-brand/25 shadow-hero-arch"
        >
          <WaveLines
            offsets={[540, 480, 420, 360, 300, 240, 180]}
            className="text-deep-blue opacity-10"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-deep-blue/40 via-transparent to-transparent"
          />
          <div className="absolute left-1/2 top-8 flex -translate-x-1/2 flex-col items-center text-center">
            <PearlDot size="lg" tone="canary" className="mb-2" />
            <span className="font-mono text-[10px] uppercase tracking-museum text-deep-blue/70">
              {arches.main.kicker}
            </span>
          </div>
          <div className="absolute inset-x-4 bottom-4 rounded-xl border border-hairline bg-soft-white/95 p-3.5 shadow-md backdrop-blur-md">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-museum text-deep-blue">
                {arches.main.number}
              </span>
              <PearlDot size="sm" />
            </div>
            <p className="font-display text-xs font-medium text-deep-blue">{arches.main.title}</p>
            <p className="mt-0.5 text-[11px] text-charcoal/70">{arches.main.place}</p>
          </div>
        </ArchFrame>

        <ArchFrame
          data-cursor="view"
          className="group absolute left-2 top-12 z-20 h-[340px] w-[220px] border border-soft-white/20 bg-deep-blue shadow-hero-arch-deep"
        >
          <NestedShapes shape="ellipse" className="text-soft-white opacity-10" />
          <PearlDot
            size="xl"
            tone="canary"
            motion="pulse"
            className="absolute left-1/2 top-6 -translate-x-1/2 shadow-glow-canary-lg"
          />
          <div className="absolute inset-x-3 bottom-3 rounded-lg border border-hairline-light bg-soft-white/10 p-2.5 text-soft-white backdrop-blur-md">
            <span className="block font-mono text-[9px] uppercase tracking-museum text-canary">
              {arches.deep.number}
            </span>
            <p className="mt-0.5 text-[10.5px] font-medium leading-tight">{arches.deep.title}</p>
          </div>
        </ArchFrame>

        <ArchFrame
          data-cursor="view"
          className="group absolute -left-6 bottom-0 z-30 h-[260px] w-[180px] border-2 border-soft-white bg-gradient-to-t from-mint-mist via-mint-mist to-soft-white shadow-hero-arch-soft"
        >
          <ConcentricRings
            radii={[60, 100, 140]}
            cy="100%"
            className="text-emerald-brand opacity-15"
          />
          <div className="absolute inset-x-3 bottom-3 rounded-lg border border-hairline-light bg-deep-blue/90 p-2 text-soft-white backdrop-blur-sm">
            <span className="block font-mono text-[9px] uppercase tracking-museum text-canary">
              {arches.raw.number}
            </span>
            <p className="mt-0.5 text-[10px] font-medium leading-tight">{arches.raw.title}</p>
          </div>
        </ArchFrame>

        <div className="group absolute -bottom-4 right-12 z-40 flex max-w-[210px] rotate-[-5deg] flex-col gap-2 rounded-2xl border border-paper-edge bg-soft-white p-3.5 shadow-tem backdrop-blur-md transition-transform duration-300 hover:rotate-[-7deg]">
          <div className="flex items-center justify-between border-b border-paper-edge pb-1.5">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-museum text-deep-blue">
              {card.label}
            </span>
            <PearlDot size="sm" tone="emerald-flat" />
          </div>
          <p className="font-display text-[11px] font-medium leading-snug text-deep-blue">
            {card.title}
          </p>
          <div className="flex items-center justify-between pt-1 text-[9px] text-charcoal/70">
            <div className="flex size-6 items-center justify-center rounded bg-deep-blue p-1 text-canary">
              <MiniQr label={card.qrLabel} />
            </div>
            <span className="font-mono font-bold text-emerald-brand">{card.note}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
