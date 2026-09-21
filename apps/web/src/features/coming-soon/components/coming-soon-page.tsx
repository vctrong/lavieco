import {
  GlowingPearl,
  ProgressTrack,
  UtilityPageShell,
  UtilityTitle,
} from "@/shared/components/utility-page";

import { LAUNCH_PROGRESS } from "../constants/config";
import { TEXT } from "../constants/text";
import { WaitlistForm } from "./waitlist-form";

/** Holding page for anything not yet opened to the public (`/sap-ra-mat`). */
export function ComingSoonPage() {
  const t = TEXT.vi;
  return (
    <UtilityPageShell
      backdrop={{ kind: "orbit" }}
      badge={t.badge}
      badgeTone="white"
      footer={false}
      above={<GlowingPearl size="lg" className="mb-6 md:mb-10" />}
    >
      <UtilityTitle
        lead={t.title.lead}
        emphasis={t.title.emphasis}
        accent
        className="max-w-3xl md:text-6xl md:leading-[1.15]"
      />
      <p className="mt-4 mb-10 font-display text-xl tracking-wide text-deep-blue/80">
        {t.subtitle}
      </p>

      <ProgressTrack
        value={LAUNCH_PROGRESS}
        label={t.progress.label}
        startLabel={t.progress.start}
        endLabel={t.progress.end}
        className="mb-12 max-w-xs md:max-w-sm"
      />

      <WaitlistForm />
      <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-charcoal/70">{t.form.note}</p>

      <dl className="mt-14 flex flex-wrap items-start justify-center gap-x-6 gap-y-6 md:mt-20 sm:gap-x-12">
        {t.facts.map((fact, index) => (
          <div key={fact.label} className="flex items-center gap-6 sm:gap-12">
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="hidden size-1.5 rounded-full bg-deep-blue/15 sm:block"
              />
            ) : null}
            <div className="flex flex-col items-center gap-1">
              <dt className="text-[11px] font-medium tracking-[0.14em] text-deep-blue">
                {fact.label}
              </dt>
              <dd className="font-display text-sm text-charcoal italic">{fact.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </UtilityPageShell>
  );
}
