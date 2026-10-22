import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { SCHOOL_PATH } from "../constants/config";
import { TEXT } from "../constants/text";

/**
 * The four value steps as one thin strip at the end of the page (docs/05 decision).
 * Fallback copy; the full description comes from `program_pages` (content-service) later.
 */
export function LadderStrip() {
  const t = TEXT.vi.ladder;
  return (
    <section
      aria-label={t.kicker}
      className="mt-20 flex flex-col gap-4 rounded-pedestal bg-mint-mist px-6 py-5 md:flex-row md:items-center md:justify-between"
    >
      <ol className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        {t.steps.map((step, index) => (
          <li key={step} className="text-body-sm text-deep-blue">
            <span className="block text-meta text-emerald-ink">
              {String(index + 1).padStart(2, "0")}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <Link
        href={SCHOOL_PATH}
        className="flex shrink-0 items-center gap-1.5 self-start text-label-caps uppercase text-emerald-ink hover:text-deep-blue md:self-center"
      >
        {t.schoolCta}
        <FiArrowRight aria-hidden="true" size={13} />
      </Link>
    </section>
  );
}
