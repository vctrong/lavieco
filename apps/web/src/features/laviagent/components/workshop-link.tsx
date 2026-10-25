import Link from "next/link";
import { FiArrowRight, FiUsers } from "react-icons/fi";

import { WORKSHOP_HREF } from "../constants/config";
import { TEXT } from "../constants/text";

const t = TEXT.vi;

/** "Học trực tiếp tại workshop LAVIECO": LaviAgent supports hands-on learning, never replaces it. */
export function WorkshopLink() {
  return (
    <Link
      href={WORKSHOP_HREF}
      className="group flex items-center gap-4 rounded-[1.5rem] border border-hairline bg-soft-white p-5 transition-colors hover:border-emerald-brand"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-deep-blue text-soft-white">
        <FiUsers aria-hidden="true" size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg text-deep-blue">{t.idea.workshop}</span>
        <span className="mt-0.5 block text-sm text-charcoal/70">{t.idea.workshopHint}</span>
      </span>
      <FiArrowRight
        aria-hidden="true"
        size={18}
        className="shrink-0 text-emerald-ink transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
