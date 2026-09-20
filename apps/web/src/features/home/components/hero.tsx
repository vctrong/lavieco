import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { Button, PearlDot } from "@lavieco/ui";

import { SECTION_IDS } from "../constants/config";
import { TEXT } from "../constants/text";
import { HeroArchComposition } from "./hero-arch-composition";
import { LaviMarquee } from "./lavi-marquee";

/** Section #1. No scroll-reveal here: it would delay LCP (docs/prompt §7). */
export function Hero() {
  const t = TEXT.vi.hero;

  return (
    <section
      id={SECTION_IDS.hero}
      className="relative flex min-h-screen flex-col justify-between overflow-hidden border-b border-hairline px-6 pb-16 pt-28 md:px-16 lg:px-24"
    >
      <div
        aria-hidden="true"
        className="scallop-pattern pointer-events-none absolute inset-0 opacity-30"
      />

      <div className="relative z-10 my-auto grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
        <div className="flex flex-col items-start pr-0 lg:col-span-7 lg:pr-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
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

          <div className="relative mb-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-8 -top-16 -z-10 select-none font-display text-[260px] font-light leading-none text-deep-blue/[0.06] sm:text-[320px] lg:text-[360px]"
            >
              {t.watermark}
            </div>
            <h1 className="relative z-10 max-w-3xl font-display text-[54px] font-light leading-[1.02] tracking-tight text-deep-blue sm:text-[80px] xl:text-[120px]">
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

          <p className="mb-9 max-w-xl text-[17px] leading-[1.7] text-charcoal/85 sm:text-[18px]">
            {t.quote} {t.body}
          </p>

          <div className="flex flex-wrap items-center gap-5">
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

          <div className="mt-12 flex w-full items-center justify-between border-t border-hairline pt-6 text-xs text-charcoal/60">
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

        <HeroArchComposition />
      </div>

      <LaviMarquee />
    </section>
  );
}
