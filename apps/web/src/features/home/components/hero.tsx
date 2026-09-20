import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { Button, Container, PearlDot } from "@lavieco/ui";

import { SECTION_IDS } from "../constants/config";
import { TEXT } from "../constants/text";
import { HeroArchComposition } from "./hero-arch-composition";
import { LaviMarquee } from "./lavi-marquee";

/**
 * Section #1. No scroll-reveal here: it would delay LCP (docs/prompt §7).
 *
 * Fits one screen: min-h-svh column, content flex-1 and centered, marquee
 * shrink-0 at the bottom. Sizes follow viewport HEIGHT as well as width (svh),
 * and it may grow taller than the screen only when the viewport is too small.
 */
export function Hero() {
  const t = TEXT.vi.hero;

  return (
    <section
      id={SECTION_IDS.hero}
      className="relative flex min-h-svh flex-col overflow-hidden border-b border-hairline"
    >
      <div
        aria-hidden="true"
        className="scallop-pattern pointer-events-none absolute inset-0 opacity-30"
      />

      <div className="relative z-10 flex flex-1 items-center pb-[clamp(0.75rem,2svh,2.5rem)] pt-dock-clearance">
        <Container>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-x-8 xl:gap-x-12">
            <div className="flex flex-col items-start gap-[clamp(0.625rem,2svh,1.75rem)] lg:col-span-7 xl:pr-8">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-soft-white px-3 py-1.5 shadow-sm">
                  <PearlDot size="md" tone="canary" motion="pulse" />
                  <span className="text-[11px] font-medium text-deep-blue">{t.pilotBadge}</span>
                </div>
                <div className="inline-flex items-center rounded-full border border-hairline bg-mint-mist/70 px-3 py-1.5 shadow-sm">
                  <span className="text-[11.5px] font-medium uppercase tracking-museum text-deep-blue">
                    {t.categoryBadge}
                  </span>
                </div>
              </div>

              <div className="relative">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-8 -top-16 -z-10 select-none font-display text-[260px] font-light leading-none text-deep-blue/[0.06] sm:text-[320px] lg:text-[360px]"
                >
                  {t.watermark}
                </div>
                {/* 120px at 1440x900; shrinks with viewport height and (near lg) width. */}
                <h1 className="relative z-10 max-w-3xl font-display text-[54px] font-light leading-[1.02] tracking-tight text-deep-blue sm:text-[80px] lg:text-[length:clamp(2.75rem,min(10vw,calc(26svh_-_114px)),7.5rem)]">
                  {t.titleLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                  <span className="block">
                    <span className="drawn-underline font-normal italic text-emerald-brand">
                      {t.titleAccent}
                    </span>
                    {t.titleEnd}
                  </span>
                </h1>
              </div>

              <p className="max-w-xl text-[length:clamp(14px,min(2.3svh,1.7vw),18px)] leading-[1.7] text-charcoal/85">
                {t.quote} {t.body}
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Button as={Link} href={`#${SECTION_IDS.journey}`}>
                  <span>{t.primaryCta}</span>
                  <PearlDot size="sm" />
                  <FiArrowRight
                    aria-hidden="true"
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Button>
                <Button as={Link} href={`#${SECTION_IDS.contact}`} variant="link">
                  <span>{t.secondaryCta}</span>
                  <FiArrowRight
                    aria-hidden="true"
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Button>
              </div>

              <div className="mt-[clamp(0.125rem,1svh,1rem)] flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-hairline pt-[clamp(0.625rem,1.8svh,1.5rem)] text-xs text-charcoal/60">
                <div className="flex items-center gap-3">
                  <span className="font-display font-medium text-deep-blue">{t.stampTitle}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t.stampPlace}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <PearlDot size="md" tone="emerald-flat" />
                  <span className="text-[11px]">{t.stampMaterial}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <HeroArchComposition />
            </div>
          </div>
        </Container>
      </div>

      <LaviMarquee />
    </section>
  );
}
