import { Eyebrow, Reveal } from "@lavieco/ui";

import { SECTION_IDS } from "../constants/config";
import { TEXT } from "../constants/text";
import { JourneyPath } from "./illustrations/journey-path";
import { JourneyFinalStage, JourneyStage } from "./journey-stage";

/** Section #3: four stages from raw shell to story (design.md §9.2 #3). */
export function JourneySection() {
  const t = TEXT.vi.journey;
  const [first, second, third, last] = t.stages;

  return (
    <section
      id={SECTION_IDS.journey}
      className="scallop-pattern relative scroll-mt-dock-clearance border-b border-hairline bg-mint-mist px-6 py-[clamp(1.25rem,3svh,2rem)] [--journey-h:clamp(310px,calc(100svh-19rem),520px)] md:px-16 lg:px-24"
    >
      <Reveal className="mx-auto max-w-7xl">
        <div className="mb-[clamp(0.5rem,1.6svh,1.25rem)] flex flex-col justify-between gap-1 border-b border-hairline pb-[clamp(0.5rem,1.6svh,1rem)] md:flex-row md:items-end md:gap-8">
          <div>
            <Eyebrow className="mb-1">{t.kicker}</Eyebrow>
            <h2 className="font-display text-[clamp(2.25rem,6svh,3rem)] font-light leading-[1.1] tracking-tight text-deep-blue">
              {t.title}
            </h2>
          </div>
          <p className="max-w-sm text-xs font-normal leading-relaxed text-charcoal/80 md:text-[13px]">
            {t.intro}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-gradient-to-r from-soft-white via-mint-mist to-deep-blue p-4 shadow-xl md:p-6 lg:p-8">
          <JourneyPath />
          <div className="relative z-10 grid grid-cols-1 items-end gap-8 md:grid-cols-2 lg:grid-cols-4">
            <JourneyStage stage={first} index={0} />
            <JourneyStage stage={second} index={1} />
            <JourneyStage stage={third} index={2} />
            <JourneyFinalStage stage={last} />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
