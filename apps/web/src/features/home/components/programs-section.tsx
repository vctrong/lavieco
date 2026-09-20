import Link from "next/link";
import { FiChevronDown } from "react-icons/fi";

import { Button, PearlDot, Reveal, cn } from "@lavieco/ui";

import { PROGRAM_LEVEL_STYLES, SECTION_IDS } from "../constants/config";
import { TEXT } from "../constants/text";

/**
 * Section #4: four value steps, rising like a tide (design.md §4.2, §9.2 #4).
 * Each description is a native <details> (open by default), so it works
 * without JavaScript and by keyboard.
 */
export function ProgramsSection() {
  const t = TEXT.vi.programs;

  return (
    <section
      id={SECTION_IDS.programs}
      className="relative border-b border-hairline bg-soft-white px-6 py-32 md:px-16 lg:px-24"
    >
      <Reveal className="mx-auto max-w-7xl">
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-hairline bg-mint-mist px-3 py-1 text-xs font-medium uppercase tracking-museum text-deep-blue">
            <PearlDot size="sm" />
            {t.badge}
          </div>
          <h2 className="mb-6 font-display text-4xl font-light tracking-tight text-deep-blue md:text-6xl">
            {t.title}
          </h2>
          <p className="text-base font-normal leading-relaxed text-charcoal/80 md:text-lg">
            {t.intro}
          </p>
        </div>

        <div className="relative grid grid-cols-1 items-end gap-7 pt-12 md:grid-cols-2 lg:grid-cols-4">
          <div
            aria-hidden="true"
            className="absolute inset-x-8 top-24 z-0 hidden h-[2px] bg-gradient-to-r from-mint-mist via-emerald-brand to-deep-blue lg:block"
          />
          {t.levels.map((level, index) => {
            const style = PROGRAM_LEVEL_STYLES[index] ?? PROGRAM_LEVEL_STYLES[0];
            return (
              <article
                key={level.number}
                className={cn(
                  "relative z-10 flex flex-col justify-between rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-2",
                  style.card,
                )}
              >
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full font-display text-sm font-semibold",
                        style.number,
                      )}
                    >
                      {level.number}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-1 text-[10.5px]", style.tag)}>
                      {level.tag}
                    </span>
                  </div>
                  <details open className="group">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                      <h3 className={cn("font-display text-2xl font-medium", style.title)}>
                        {level.title}
                      </h3>
                      <FiChevronDown
                        aria-hidden="true"
                        size={18}
                        className="mt-1.5 shrink-0 transition-transform duration-300 group-open:rotate-180"
                      />
                    </summary>
                    <p className={cn("mt-3 mb-6 text-xs leading-relaxed", style.body)}>
                      {level.description}
                    </p>
                  </details>
                </div>
                <div className={cn("border-t pt-4", style.foot)}>
                  <span
                    className={cn(
                      "mb-1 block text-[11px] font-semibold uppercase tracking-museum",
                      style.footLabel,
                    )}
                  >
                    {level.footLabel}
                  </span>
                  <p className={cn("text-xs font-medium", style.footText)}>{level.foot}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <Button as={Link} href={`#${SECTION_IDS.contact}`} variant="deep" className="px-8">
            <span>{t.cta}</span>
            <PearlDot size="sm" />
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
