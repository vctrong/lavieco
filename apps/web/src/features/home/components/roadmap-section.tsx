import { Eyebrow, PearlDot, Reveal, WaveLines, cn } from "@lavieco/ui";

import { ROADMAP_PHASE_STYLES } from "../constants/config";
import { TEXT } from "../constants/text";

/**
 * Section #8: three waves of rising height (design.md §9.2 #8).
 * TODO(content): phase dates come from the prototype ("Quý 2 - 4 / 2025") and are stale.
 */
export function RoadmapSection() {
  const t = TEXT.vi.roadmap;

  return (
    <section className="relative border-b border-hairline bg-soft-white px-6 py-28 md:px-16 lg:px-24">
      <Reveal className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <Eyebrow className="mb-2">{t.kicker}</Eyebrow>
          <h2 className="mb-4 font-display text-4xl font-light tracking-tight text-deep-blue md:text-5xl lg:text-6xl">
            {t.title}
          </h2>
          <p className="text-sm leading-relaxed text-charcoal/75 md:text-base">{t.intro}</p>
        </div>

        <div className="relative pb-6 pt-12">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 z-0 hidden h-[2px] bg-deep-blue/15 md:block"
          />
          <ol className="relative z-10 grid grid-cols-1 items-end gap-8 md:grid-cols-3">
            {t.phases.map((phase, index) => {
              const style = ROADMAP_PHASE_STYLES[index] ?? ROADMAP_PHASE_STYLES[0];
              const badge = "badge" in phase ? phase.badge : null;
              return (
                <li key={phase.title} className="flex flex-col justify-end">
                  <div className="mb-6">
                    <div
                      className={cn(
                        "mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-museum",
                        style.status,
                      )}
                    >
                      {index === 2 ? (
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-charcoal/40" />
                      ) : (
                        <PearlDot
                          size={index === 0 ? "md" : "sm"}
                          tone={index === 0 ? "canary" : "emerald-flat"}
                          motion={index === 0 ? "ping" : "none"}
                        />
                      )}
                      {phase.status}
                    </div>
                    <h3 className="mb-2 font-display text-2xl font-medium text-deep-blue">
                      {phase.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-charcoal/75">{phase.description}</p>
                  </div>
                  <div
                    className={cn(
                      "relative flex w-full flex-col justify-between overflow-hidden rounded-b-2xl p-5",
                      style.wave,
                    )}
                  >
                    <WaveLines
                      offsets={index === 0 ? [120] : [160, 120]}
                      className="text-deep-blue opacity-15"
                    />
                    <div className="relative flex items-center justify-between">
                      <span
                        className={cn(
                          "font-mono text-xs font-bold uppercase tracking-wider",
                          style.waveLabel,
                        )}
                      >
                        {phase.wave}
                      </span>
                      {badge ? (
                        <span className="rounded-full bg-emerald-brand/20 px-2.5 py-0.5 font-mono text-[9.5px] font-bold text-emerald-brand">
                          {badge}
                        </span>
                      ) : (
                        <PearlDot size="lg" tone={index === 0 ? "canary" : "emerald"} />
                      )}
                    </div>
                    <ul className="relative space-y-1.5">
                      {phase.highlights.map((highlight) => (
                        <li
                          key={highlight}
                          className="rounded-lg border border-hairline bg-soft-white/80 px-3 py-1.5 text-[11px] font-medium text-deep-blue"
                        >
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </Reveal>
    </section>
  );
}
