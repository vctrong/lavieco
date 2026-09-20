import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { ArchFrame, ConcentricRings, PearlDot, Reveal, SectionHeader, cn } from "@lavieco/ui";

import { COLLECTION_CARD_STYLES, ROUTES, SECTION_IDS } from "../constants/config";
import { TEXT } from "../constants/text";

/** Section #5: three proof objects, each with a tilted story card behind (BR-01, BR-10). */
export function CollectionSection() {
  const t = TEXT.vi.collection;

  return (
    <section
      id={SECTION_IDS.collection}
      className="relative overflow-hidden border-b border-hairline bg-mint-mist/40 px-6 py-32 md:px-16 lg:px-24"
    >
      <Reveal className="mx-auto max-w-7xl">
        <SectionHeader kicker={t.kicker} title={t.title} className="mb-16" />

        <ul className="grid grid-cols-1 items-end gap-8 md:grid-cols-3 lg:gap-10">
          {t.items.map((item, index) => {
            const style = COLLECTION_CARD_STYLES[index] ?? COLLECTION_CARD_STYLES[0];
            return (
              <li key={item.title} className="group relative flex flex-col justify-end">
                <div
                  className={cn(
                    "absolute z-0 rounded-2xl border border-paper-edge bg-paper p-3 shadow-md transition-all duration-300 group-hover:-translate-y-2",
                    style.story,
                  )}
                >
                  <div className="mb-1 flex items-center justify-between border-b border-paper-edge pb-1">
                    <span className="font-mono text-[8.5px] font-bold uppercase text-deep-blue">
                      {item.storyLabel}
                    </span>
                    <PearlDot size="sm" tone={index === 1 ? "canary-flat" : "emerald-flat"} />
                  </div>
                  <p className="font-display text-[10px] italic leading-snug text-charcoal/80">
                    {item.storyQuote}
                  </p>
                </div>
                <ArchFrame
                  data-cursor="view"
                  className={cn(
                    "relative z-10 flex w-full flex-col justify-between border bg-soft-white p-4 transition-shadow",
                    style.arch,
                  )}
                >
                  <div
                    className={cn(
                      "relative flex w-full items-center justify-center overflow-hidden rounded-t-full rounded-b-xl bg-gradient-to-b from-mint-mist via-mint-mist",
                      style.visual,
                    )}
                  >
                    <ConcentricRings radii={style.rings} className="text-deep-blue opacity-10" />
                    <div className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap rounded-full bg-deep-blue px-2.5 py-1 font-mono text-[10px] font-medium text-soft-white shadow-sm">
                      {item.price}
                    </div>
                    <div className="z-10 px-4 text-center">
                      <PearlDot size="lg" tone="canary" className="mb-2" />
                      <h3 className="font-display text-base font-medium text-deep-blue">
                        {item.visualTitle}
                      </h3>
                      <p className="mt-0.5 font-mono text-[11px] text-charcoal/60">
                        {item.visualMaterial}
                      </p>
                    </div>
                    <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded border border-hairline bg-soft-white/95 px-2.5 py-1 text-[9.5px] text-deep-blue">
                      <span className="font-mono">{item.tag}</span>
                      <span className="font-bold text-emerald-brand">{item.highlight}</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <h3 className="font-display text-xl font-medium text-deep-blue">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-charcoal/75">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-hairline pt-2 text-xs font-medium text-emerald-brand">
                    <span className="font-mono text-[10.5px]">{item.foot}</span>
                    <FiArrowRight
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </ArchFrame>
              </li>
            );
          })}
        </ul>

        <p className="mt-10 text-center text-xs text-charcoal/60">{t.priceNote}</p>

        <div className="mt-8 text-center">
          <Link
            href={ROUTES.collection}
            className="group inline-flex items-center gap-2 text-sm font-semibold text-deep-blue underline decoration-emerald-brand/40 decoration-2 underline-offset-8 transition-colors hover:text-emerald-brand"
          >
            <span>{t.cta}</span>
            <FiArrowRight
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
