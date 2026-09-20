import { Reveal, SectionHeader } from "@lavieco/ui";

import { MEMBERS } from "../constants/members";
import { TEAM_SECTION_ID } from "../constants/config";
import { TEXT } from "../constants/text";
import { MemberCard } from "./member-card";

/** Section #9: the six storytellers (static data, docs/04 §5.3). */
export function TeamSection() {
  const t = TEXT.vi;

  return (
    <section
      id={TEAM_SECTION_ID}
      className="relative border-b border-hairline bg-mint-mist/30 px-6 py-32 md:px-16 lg:px-24"
    >
      <Reveal className="mx-auto max-w-7xl">
        <SectionHeader kicker={t.kicker} title={t.title} className="mb-16">
          <p className="mt-4 max-w-sm text-sm font-normal text-charcoal/70 md:mt-0">{t.intro}</p>
        </SectionHeader>
        <ul className="grid grid-cols-1 items-start gap-8 md:grid-cols-3 lg:gap-10">
          {MEMBERS.map((member, index) => (
            <MemberCard key={member.id} member={member} index={index} />
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
