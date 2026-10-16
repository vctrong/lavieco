import { Eyebrow } from "@lavieco/ui";
import type { StaffProfile } from "@lavieco/shared/identity";

import { TEXT } from "../constants/text";

/**
 * Placeholder overview. The operations dashboard (revenue, fill rate, recent orders)
 * comes with ticketing, docs/05 §9 phase 6.
 */
export function OverviewPage({ staff }: { staff: StaffProfile }) {
  const t = TEXT.vi;
  return (
    <div className="max-w-3xl">
      <Eyebrow className="mb-3">{t.eyebrow}</Eyebrow>
      <h1 className="font-display text-4xl text-deep-blue">
        {t.greeting} <em className="text-emerald-brand">{staff.displayName}</em>
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-charcoal/75">{t.body}</p>
      <section className="mt-10 rounded-3xl border border-hairline bg-white p-6 shadow-ambient">
        <h2 className="mb-4 font-display text-xl text-deep-blue">{t.permissionsTitle}</h2>
        <ul className="flex flex-wrap gap-2">
          {staff.permissions.map((permission) => (
            <li
              key={permission}
              className="rounded-full bg-mint-mist px-3 py-1 font-mono text-[12px] text-deep-blue"
            >
              {permission}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
