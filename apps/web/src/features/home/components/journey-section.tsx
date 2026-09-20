import { Reveal, SectionHeader } from "@lavieco/ui";

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
      className="scallop-pattern relative border-b border-hairline bg-mint-mist px-6 py-32 md:px-16 lg:px-24"
    >
      <Reveal className="mx-auto max-w-7xl">
        <SectionHeader kicker={t.kicker} title={t.title} className="mb-20">
          <p className="mt-4 max-w-md text-sm font-normal leading-relaxed text-charcoal/80 md:mt-0 md:text-base">
            {t.intro}
          </p>
        </SectionHeader>

        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-gradient-to-r from-soft-white via-mint-mist to-deep-blue p-6 shadow-xl md:p-10 lg:p-12">
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
