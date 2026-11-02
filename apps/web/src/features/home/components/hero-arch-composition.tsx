import Image from "next/image";
import type { ComponentProps } from "react";

import { ArchFrame, ConcentricRings, NestedShapes, PearlDot, WaveLines, cn } from "@lavieco/ui";

import { HERO_ARCH_IMAGES } from "../constants/config";
import { TEXT } from "../constants/text";
import { HeroArchStage } from "./hero-arch-stage";
import { MiniQr } from "./illustrations/mini-qr";

/**
 * Fan-out motion. Only `translate`, `rotate`, `scale` and `transform` move, so nothing
 * reflows. `--fan` scales the travel down on narrow screens, where the front arch already
 * sits near the edge of a section that clips its overflow. The delay list is per property:
 * parallax (`transform`) has none, because a delay would restart on every pointer move and
 * hold the arch still.
 */
const ARCH_MOTION =
  "transition-[translate,rotate,scale,box-shadow,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[fanned=true]/fan:shadow-[0_36px_70px_color-mix(in_srgb,var(--color-deep-blue)_28%,transparent)] hover:z-50";
const ARCH_FRONT_MOTION =
  "[transition-delay:0ms] [transform:translate3d(var(--hero-px,0px),var(--hero-py,0px),0)] motion-safe:group-data-[fanned=true]/fan:translate-x-[calc(var(--fan)*-14px)] motion-safe:group-data-[fanned=true]/fan:translate-y-[calc(var(--fan)*10px)] motion-safe:group-data-[fanned=true]/fan:rotate-[-4deg]";
const ARCH_MIDDLE_MOTION =
  "[transition-delay:60ms,60ms,60ms,60ms,0ms] [transform:translate3d(calc(var(--hero-px,0px)*0.6),calc(var(--hero-py,0px)*0.6),0)] motion-safe:group-data-[fanned=true]/fan:-translate-y-[calc(var(--fan)*10px)] group-data-[fanned=true]/fan:scale-[1.03]";
const ARCH_REAR_MOTION =
  "[transition-delay:120ms,120ms,120ms,120ms,0ms] [transform:translate3d(calc(var(--hero-px,0px)*0.35),calc(var(--hero-py,0px)*0.35),0)] motion-safe:group-data-[fanned=true]/fan:translate-x-[calc(var(--fan)*12px)] motion-safe:group-data-[fanned=true]/fan:-translate-y-[calc(var(--fan)*10px)] motion-safe:group-data-[fanned=true]/fan:rotate-[3deg]";

const LABEL_MOTION = "transition-transform duration-500 motion-safe:group-hover:-translate-y-1.5";
const PEARL_GLOW =
  "transition-shadow duration-700 group-data-[fanned=true]/fan:shadow-[0_0_18px_var(--color-canary)]";
const RINGS_SPREAD =
  "transition-[scale,opacity] duration-700 ease-out group-data-[fanned=true]/fan:scale-110 group-data-[fanned=true]/fan:opacity-15";

type ArchPhotoProps = Pick<ComponentProps<typeof Image>, "src" | "alt" | "sizes"> & {
  /** Only the largest arch, the hero's LCP element, is preloaded. */
  preload?: boolean;
};

/** Image, plus a sheen that crosses it once as the fan opens (no transition on the way back). */
function ArchPhoto({ src, alt, sizes, preload = false }: ArchPhotoProps) {
  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        {...(preload ? { preload: true } : { loading: "eager" as const })}
        className="object-cover transition-[scale,filter] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[fanned=true]/fan:scale-[1.06] group-data-[fanned=true]/fan:brightness-105"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-soft-white/30 to-transparent motion-reduce:hidden group-data-[fanned=true]/fan:translate-x-[400%] group-data-[fanned=true]/fan:transition-[translate] group-data-[fanned=true]/fan:duration-[1100ms] group-data-[fanned=true]/fan:ease-out"
      />
    </>
  );
}

/**
 * Three overlapping arches plus a tilted story card (design.md §9.2 #1), opening like a fan
 * on hover (see HeroArchStage and ARCH_MOTION).
 */
export function HeroArchComposition() {
  const arches = TEXT.vi.heroArches;
  const card = TEXT.vi.storyCard;

  return (
    // The whole cluster is authored on a fixed 460x560 canvas and scaled as one unit
    // to the width of its column (container query units), so arches, cards and labels
    // never drift apart. The width is also capped by viewport height (svh).
    <HeroArchStage className="group/fan @container relative mx-auto aspect-[460/560] w-[min(100%,460px)] [--fan:0.35] md:[--fan:1] lg:ml-auto lg:mr-0 lg:w-[min(100%,calc(62svh*46/56))]">
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
          className={cn(
            "group absolute right-0 top-0 z-10 h-[520px] w-[340px] border border-emerald-brand/30 bg-mint-mist shadow-hero-arch",
            ARCH_MOTION,
            ARCH_REAR_MOTION,
          )}
        >
          <ArchPhoto
            src={HERO_ARCH_IMAGES.main}
            alt={arches.main.imageAlt}
            sizes="(max-width: 460px) 74vw, 340px"
            preload
          />
          <WaveLines
            offsets={[540, 480, 420, 360, 300, 240, 180]}
            className="text-soft-white opacity-20"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-deep-blue/60 via-transparent to-deep-blue/40"
          />
          <PearlDot
            size="lg"
            tone="canary"
            className={cn("absolute left-1/2 top-3 -translate-x-1/2", PEARL_GLOW)}
          />
          <div
            className={cn(
              "absolute bottom-[76px] left-[116px] right-3 rounded-xl border border-hairline bg-soft-white/95 p-2.5 shadow-md backdrop-blur-md",
              LABEL_MOTION,
            )}
          >
            <span className="block font-mono text-[9px] uppercase tracking-museum text-charcoal/70">
              {arches.main.kicker}
            </span>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-museum text-deep-blue">
              {arches.main.number}
            </span>
            <p className="font-display text-xs font-medium text-deep-blue">{arches.main.title}</p>
            <p className="mt-0.5 text-[11px] text-charcoal/70">{arches.main.place}</p>
          </div>
        </ArchFrame>

        <ArchFrame
          data-cursor="view"
          className={cn(
            "group absolute left-2 top-12 z-20 h-[340px] w-[220px] border border-soft-white/20 bg-deep-blue shadow-hero-arch-deep",
            ARCH_MOTION,
            ARCH_MIDDLE_MOTION,
          )}
        >
          <ArchPhoto
            src={HERO_ARCH_IMAGES.deep}
            alt={arches.deep.imageAlt}
            sizes="(max-width: 460px) 48vw, 220px"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-deep-blue/80 via-deep-blue/15 to-deep-blue/30"
          />
          <NestedShapes
            shape="ellipse"
            className={cn("text-soft-white opacity-25", RINGS_SPREAD)}
          />
          <PearlDot
            size="xl"
            tone="canary"
            motion="pulse"
            className={cn(
              "absolute left-1/2 top-6 -translate-x-1/2 shadow-glow-canary-lg",
              PEARL_GLOW,
            )}
          />
          <div
            className={cn(
              "absolute inset-x-3 bottom-[96px] rounded-lg border border-hairline-light bg-deep-blue/80 p-2.5 text-soft-white backdrop-blur-md",
              LABEL_MOTION,
            )}
          >
            <span className="block font-mono text-[9px] uppercase tracking-museum text-canary">
              {arches.deep.number}
            </span>
            <p className="mt-0.5 text-[10.5px] font-medium leading-tight">{arches.deep.title}</p>
          </div>
        </ArchFrame>

        <ArchFrame
          data-cursor="view"
          className={cn(
            "group absolute -left-6 bottom-0 z-30 h-[260px] w-[180px] border-2 border-soft-white bg-mint-mist shadow-hero-arch-soft",
            ARCH_MOTION,
            ARCH_FRONT_MOTION,
          )}
        >
          <ArchPhoto
            src={HERO_ARCH_IMAGES.raw}
            alt={arches.raw.imageAlt}
            sizes="(max-width: 460px) 40vw, 180px"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-deep-blue/60 via-transparent to-transparent"
          />
          <ConcentricRings
            radii={[60, 100, 140]}
            cy="100%"
            className={cn("origin-bottom text-soft-white opacity-40", RINGS_SPREAD)}
          />
          <div
            className={cn(
              "absolute inset-x-3 bottom-3 rounded-lg border border-hairline-light bg-deep-blue/90 p-2 text-soft-white backdrop-blur-sm",
              LABEL_MOTION,
            )}
          >
            <span className="block font-mono text-[9px] uppercase tracking-museum text-canary">
              {arches.raw.number}
            </span>
            <p className="mt-0.5 text-[10px] font-medium leading-tight">{arches.raw.title}</p>
          </div>
        </ArchFrame>

        <div className="group absolute -bottom-4 right-12 z-40 flex max-w-[210px] rotate-[-5deg] flex-col gap-2 rounded-2xl border border-paper-edge bg-soft-white p-3.5 shadow-tem backdrop-blur-md transition-[translate,rotate] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:rotate-[-7deg] motion-safe:group-data-[fanned=true]/fan:translate-x-[calc(var(--fan)*6px)] motion-safe:group-data-[fanned=true]/fan:translate-y-[calc(var(--fan)*4px)]">
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
    </HeroArchStage>
  );
}
