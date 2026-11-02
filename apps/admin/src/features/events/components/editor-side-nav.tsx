import { FiAlertTriangle, FiCheck } from "react-icons/fi";

import type { EventView } from "@lavieco/shared/events";
import { cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { editorNavItems } from "../utils/editor-sections";

/** Anchor menu of the editor: a row on small screens, a sticky column on large ones. */
export function EditorSideNav({
  event,
  withVouchers = false,
  withSurveys = false,
}: {
  event: EventView;
  withVouchers?: boolean;
  withSurveys?: boolean;
}) {
  const t = TEXT.vi.editorBar;
  return (
    <nav aria-label={t.navLabel} className="lg:sticky lg:top-24 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto rounded-2xl border border-hairline bg-white p-2 lg:flex-col lg:overflow-visible">
        {editorNavItems(event).map((item) => {
          const attention = item.status === "attention";
          const Icon = attention ? FiAlertTriangle : FiCheck;
          return (
            <li key={item.key} className="shrink-0">
              <a
                href={`#${item.anchor}`}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-deep-blue hover:bg-mint-mist"
              >
                {t.nav[item.key]}
                <Icon
                  role="img"
                  aria-label={attention ? t.navAttention : t.navOk}
                  size={14}
                  className={cn("shrink-0", attention ? "text-deep-blue" : "text-emerald-ink")}
                />
              </a>
            </li>
          );
        })}
        {withVouchers ? (
          <li className="shrink-0">
            <a
              href="#ma-giam-gia"
              className="flex items-center rounded-xl px-3 py-2 text-[13px] font-medium text-deep-blue hover:bg-mint-mist"
            >
              {t.navVouchers}
            </a>
          </li>
        ) : null}
        {withSurveys ? (
          <li className="shrink-0">
            <a
              href="#khao-sat-feedback"
              className="flex items-center rounded-xl px-3 py-2 text-[13px] font-medium text-deep-blue hover:bg-mint-mist"
            >
              {t.navSurveys}
            </a>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
