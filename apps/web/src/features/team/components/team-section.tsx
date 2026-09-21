import { Eyebrow, Reveal } from "@lavieco/ui";

import { MEMBERS } from "../constants/members";
import { TEAM_SECTION_ID } from "../constants/config";
import { TEXT } from "../constants/text";
import { TeamGrid } from "./team-grid";

/**
 * Section #9: the six storytellers (static data, docs/04 §5.3). Sized by viewport height:
 * the title and the first row of three fit one screen, and so does the second row.
 * `scroll-mt` keeps the fixed dock off the title when jumping here from the contents.
 */
export function TeamSection() {
  const t = TEXT.vi;

  return (
    <section
      id={TEAM_SECTION_ID}
      className="relative scroll-mt-dock-clearance overflow-x-clip border-b border-hairline bg-mint-mist/30 px-6 pb-[clamp(2rem,6svh,4rem)] pt-[clamp(1.25rem,3svh,2rem)] md:px-16 lg:px-24"
    >
      <Reveal className="mx-auto max-w-7xl">
        <div className="mb-[clamp(0.5rem,1.6svh,1.25rem)] flex flex-col justify-between gap-1 border-b border-hairline pb-[clamp(0.5rem,1.6svh,1rem)] md:flex-row md:items-end md:gap-8">
          <div>
            <Eyebrow className="mb-1">{t.kicker}</Eyebrow>
            <h2 className="font-display text-[clamp(2.25rem,6svh,3rem)] font-light leading-[1.1] tracking-tight text-deep-blue">
              {t.title}
            </h2>
          </div>
          <p className="max-w-xs text-xs font-normal leading-relaxed text-charcoal/70 md:text-[13px]">
            {t.intro}
          </p>
        </div>
        <TeamGrid members={MEMBERS} />
      </Reveal>
    </section>
  );
}
