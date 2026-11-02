import Image from "next/image";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { PearlDot, Reveal, SectionHeader, cn } from "@lavieco/ui";

import {
  COLLECTION_CARD_IMAGES,
  COLLECTION_CARD_STYLES,
  ROUTES,
  SECTION_IDS,
} from "../constants/config";
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
        <SectionHeader kicker={t.kicker} title={t.title} className="mb-24" />

        <ul className="grid grid-cols-1 items-end gap-x-8 gap-y-28 md:grid-cols-3 lg:gap-x-10">
          {t.items.map((item, index) => {
            const style = COLLECTION_CARD_STYLES[index] ?? COLLECTION_CARD_STYLES[0];
            const image = COLLECTION_CARD_IMAGES[index] ?? COLLECTION_CARD_IMAGES[0];
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
                <div
                  data-cursor="view"
                  className={cn(
                    "relative z-10 flex w-full flex-col justify-between gap-2 rounded-3xl border bg-soft-white p-4 transition-shadow",
                    style.card,
                  )}
                >
                  <div>
                    <div
                      className={cn(
                        "relative w-full overflow-hidden rounded-2xl bg-mint-mist",
                        style.visual,
                      )}
                    >
                      <Image
                        src={image.src}
                        alt={item.imageAlt}
                        fill
                        sizes="(min-width: 768px) 30vw, 90vw"
                        className="object-cover"
                      />
                      <div className="absolute left-3 top-3 whitespace-nowrap rounded-full bg-deep-blue px-2.5 py-1 font-mono text-[10px] font-medium text-soft-white shadow-sm">
                        {item.price}
                      </div>
                      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded border border-hairline bg-soft-white/95 px-2.5 py-1 text-[9.5px] text-deep-blue">
                        {/* Three narrow columns (md) leave no room for both. */}
                        <span className="hidden font-mono max-md:inline lg:inline">{item.tag}</span>
                        <span className="font-bold text-emerald-brand">{item.highlight}</span>
                      </div>
                    </div>
                    {image.illustrative ? (
                      <p className="mt-1 text-right text-[10px] text-charcoal/60">
                        {t.illustrativeNote}
                      </p>
                    ) : null}
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
                </div>
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
