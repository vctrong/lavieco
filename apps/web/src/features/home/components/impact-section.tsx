import { FiGlobe, FiUsers } from "react-icons/fi";

import { Reveal, SectionHeader, cn } from "@lavieco/ui";

import { SECTION_IDS } from "../constants/config";
import { TEXT } from "../constants/text";

const PILLAR_ICONS = [FiUsers, FiGlobe] as const;
const STAT_BORDERS = ["border-emerald-brand", "border-canary", "border-emerald-brand"] as const;

/**
 * Section #7 (Deep Sea): two pillars and three sourced statistics.
 * TODO(BR-09): impact figures are published only with a source and Super Admin
 * approval; these are the prototype's fallback figures and need sign-off.
 */
export function ImpactSection() {
  const t = TEXT.vi.impact;

  return (
    <section
      id={SECTION_IDS.impact}
      className="deep-sea-pattern relative overflow-hidden border-b border-hairline-light px-6 py-32 text-soft-white md:px-16 lg:px-24"
    >
      <div
        aria-hidden="true"
        className="scallop-pattern pointer-events-none absolute inset-0 opacity-5"
      />
      <Reveal className="relative z-10 mx-auto max-w-7xl">
        <SectionHeader kicker={t.kicker} title={t.title} tone="dark" className="mb-20">
          <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-mint-mist/80 md:mt-0 md:text-base">
            {t.intro}
          </p>
        </SectionHeader>

        <div className="mb-24 grid grid-cols-1 gap-12 md:grid-cols-2">
          {t.pillars.map((pillar, index) => {
            const Icon = PILLAR_ICONS[index] ?? FiUsers;
            return (
              <article
                key={pillar.title}
                className="relative flex flex-col justify-between rounded-3xl border border-hairline-light bg-soft-white/5 p-8 backdrop-blur-sm md:p-10"
              >
                <div>
                  <div
                    className={cn(
                      "mb-6 flex size-12 items-center justify-center rounded-2xl border border-emerald-brand/40 bg-emerald-brand/20",
                      index === 0 ? "text-canary" : "text-emerald-brand",
                    )}
                  >
                    <Icon aria-hidden="true" size={24} />
                  </div>
                  <h3 className="mb-4 font-display text-2xl font-normal text-soft-white md:text-3xl">
                    {pillar.title}
                  </h3>
                  <p className="mb-6 text-sm font-light leading-relaxed text-mint-mist/80">
                    {pillar.description}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-hairline-light pt-4 text-xs text-mint-mist/70">
                  <span>{pillar.foot}</span>
                  <span className="shrink-0 font-medium text-canary">{pillar.badge}</span>
                </div>
              </article>
            );
          })}
        </div>

        <dl className="grid grid-cols-1 gap-8 border-t border-hairline-light pt-12 md:grid-cols-3">
          {t.stats.map((stat, index) => (
            <div key={stat.value} className={cn("border-l-2 pl-6", STAT_BORDERS[index])}>
              <dt className="sr-only">{stat.caption}</dt>
              <dd>
                <div className="mb-2 font-display text-5xl font-light text-soft-white md:text-6xl">
                  {stat.value}
                  {stat.unit ? (
                    <span className="font-sans text-3xl font-light text-canary">{stat.unit}</span>
                  ) : null}
                </div>
                <p className="mb-1 text-sm font-medium leading-snug text-mint-mist">
                  {stat.caption}
                </p>
                <span className="font-mono text-[11px] uppercase tracking-wider text-mint-mist/60">
                  {stat.source}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 border-t border-hairline-light/50 pt-6 text-right">
          <p className="text-[11px] italic text-mint-mist/60">{t.footnote}</p>
        </div>
      </Reveal>
    </section>
  );
}
