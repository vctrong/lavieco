import type { StaffProfile } from "@lavieco/shared/identity";

import { TEXT } from "../constants/text";
import { Navigation, StaffChip } from "./shell-parts";

/** "Thêm" tab on phones: the full navigation and the account, as a page (no JS needed). */
export function MorePage({ staff }: { staff: StaffProfile }) {
  const t = TEXT.vi.more;
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <header>
        <h1 className="font-display text-3xl text-deep-blue">{t.title}</h1>
        <p className="mt-1 text-[15px] text-charcoal/70">{t.lead}</p>
      </header>
      <StaffChip staff={staff} />
      <Navigation staff={staff} />
    </div>
  );
}
