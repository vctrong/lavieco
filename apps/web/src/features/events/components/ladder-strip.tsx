import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { Eyebrow } from "@lavieco/ui";

import { SCHOOL_PATH } from "../constants/config";
import { TEXT } from "../constants/text";

/**
 * The four value steps condensed into one strip (docs/05 decision). Fallback copy;
 * the full description comes from `program_pages` (content-service) later.
 */
export function LadderStrip() {
  const t = TEXT.vi.ladder;
  return (
    <section
      aria-labelledby="nac-thang"
      className="rounded-3xl border border-hairline bg-white p-6 md:p-8"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <Eyebrow className="mb-2">
            <span id="nac-thang">{t.kicker}</span>
          </Eyebrow>
          <p className="text-[14px] leading-relaxed text-charcoal/75">{t.intro}</p>
        </div>
        <Link
          href={SCHOOL_PATH}
          className="flex items-center gap-1.5 rounded-full border border-deep-blue/20 px-4 py-2 text-[13px] font-semibold text-deep-blue hover:border-emerald-brand hover:bg-mint-mist"
        >
          {t.schoolCta}
          <FiArrowRight aria-hidden="true" size={13} />
        </Link>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {t.steps.map((step) => (
          <li key={step.number} className="rounded-2xl bg-soft-white p-4">
            <span className="font-display text-sm text-emerald-brand">{step.number}</span>
            <p className="mt-1 font-display text-lg leading-snug text-deep-blue">{step.title}</p>
            <p className="mt-1 text-[12.5px] text-charcoal/60">{step.note}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
