import { FiLogOut, FiUser } from "react-icons/fi";

import { PearlDot } from "@lavieco/ui";
import type { StaffProfile } from "@lavieco/shared/identity";
import { can } from "@lavieco/shared/permissions";

import { logout } from "../actions/logout";
import { NAV_GROUPS } from "../constants/nav";
import { TEXT } from "../constants/text";
import { NavLink } from "./nav-link";

export function Navigation({ staff }: { staff: StaffProfile }) {
  const t = TEXT.vi;
  return (
    <nav aria-label={t.navLabel} className="space-y-6">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => !item.permission || can(staff, item.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.id}>
            <p className="mb-2 px-4 text-[10.5px] font-semibold uppercase tracking-museum text-deep-blue/50">
              {t.groups[group.id]}
            </p>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>
                  <NavLink
                    href={item.href}
                    label={t.items[item.id as keyof typeof t.items]}
                    available={item.available}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function Brand() {
  const t = TEXT.vi;
  return (
    <div>
      <p className="flex items-center gap-1.5 font-display text-2xl text-deep-blue">
        {t.brand}
        <PearlDot size="sm" tone="canary" />
      </p>
      <p className="text-[11px] uppercase tracking-museum text-charcoal/55">{t.brandSub}</p>
    </div>
  );
}

export function StaffChip({ staff }: { staff: StaffProfile }) {
  const t = TEXT.vi;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-white p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-brand text-deep-blue">
          <FiUser aria-hidden="true" size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-deep-blue">{staff.displayName}</p>
          <p className="truncate text-[11px] text-charcoal/60">
            {staff.roles.map((role) => t.roles[role]).join(" · ")}
          </p>
        </div>
      </div>
      <form action={logout}>
        <button
          type="submit"
          aria-label={t.logout}
          title={t.logout}
          className="flex size-11 items-center justify-center rounded-full text-deep-blue transition-colors hover:bg-mint-mist lg:size-8"
        >
          <FiLogOut aria-hidden="true" size={15} />
        </button>
      </form>
    </div>
  );
}
