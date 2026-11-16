import type { ReactNode } from "react";
import { FiMenu } from "react-icons/fi";

import type { StaffProfile } from "@lavieco/shared/identity";
import { can } from "@lavieco/shared/permissions";

import { MOBILE_TABS } from "../constants/nav";
import { TEXT } from "../constants/text";
import { Brand, Navigation, StaffChip } from "./shell-parts";
import { TabBar } from "./tab-bar";

/**
 * Back-office frame, three widths (docs/PWA.md):
 * - phones (< 768 px): slim top bar + bottom tab bar, "Thêm" opens `/more`;
 * - tablets (768–1023 px): top bar with the collapsible full menu;
 * - desktop (≥ 1024 px): fixed sidebar.
 * Insets keep content clear of the notch and the iOS home bar in the installed app.
 * Works without JavaScript.
 */
export function AdminShell({ staff, children }: { staff: StaffProfile; children: ReactNode }) {
  const t = TEXT.vi;
  const tabs = MOBILE_TABS.filter((tab) => !tab.permission || can(staff, tab.permission));
  return (
    <div className="min-h-dvh bg-soft-white lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-hairline bg-soft-white px-4 py-8 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-8 lg:overflow-y-auto">
        <div className="px-4">
          <Brand />
        </div>
        <div className="flex-1">
          <Navigation staff={staff} />
        </div>
        <StaffChip staff={staff} />
      </aside>

      <header className="sticky top-0 z-30 border-b border-hairline bg-soft-white/95 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
        <Brand />
      </header>

      <header className="sticky top-0 z-30 hidden border-b border-hairline bg-soft-white/95 px-4 py-3 backdrop-blur md:block lg:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <Brand />
            <span className="flex min-h-11 items-center gap-2 rounded-full border border-hairline px-4 text-[13px] font-medium text-deep-blue">
              <FiMenu aria-hidden="true" size={15} />
              {t.menu}
            </span>
          </summary>
          <div className="mt-4 space-y-6 pb-2">
            <Navigation staff={staff} />
            <StaffChip staff={staff} />
          </div>
        </details>
      </header>

      {/* Phones: small buttons of @lavieco/ui grow to a 44 px touch target. */}
      <main className="min-w-0 px-[max(1rem,env(safe-area-inset-left))] max-md:[&_[data-size=sm]]:min-h-11 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 md:px-10 md:py-8 lg:py-12">
        {children}
      </main>

      <TabBar tabs={tabs} />
    </div>
  );
}
