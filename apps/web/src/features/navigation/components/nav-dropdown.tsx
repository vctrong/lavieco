"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { FiChevronDown } from "react-icons/fi";

import { PearlDot, cn } from "@lavieco/ui";

import { useDisclosure } from "../hooks/use-disclosure";
import { isNavItemActive } from "../utils/is-nav-item-active";
import { MENU_PANEL_CLASS, NAV_LINK_CLASS } from "./styles";

export type NavDropdownItem = {
  id: string;
  href: string;
  title: string;
  description?: string;
  icon?: typeof FiChevronDown;
};

type NavDropdownProps = {
  label: string;
  /** Rich panel with an icon and a description per link ("Khám phá"), or a plain list ("Thêm"). */
  variant: "rich" | "compact";
  heading?: string;
  items: readonly NavDropdownItem[];
  className?: string;
};

/** "Khám phá ▾" and "Thêm ▾": a disclosure button over a panel of links. */
export function NavDropdown({ label, variant, heading, items, className }: NavDropdownProps) {
  const pathname = usePathname();
  const panelId = useId();
  const {
    open,
    toggle,
    close,
    rootRef,
    triggerRef,
    panelRef,
    onTriggerKeyDown,
    onPanelKeyDown,
    onBlur,
  } = useDisclosure();
  const active = items.some((item) => isNavItemActive(pathname, item.href));

  return (
    <div ref={rootRef} onBlur={onBlur} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          NAV_LINK_CLASS,
          "gap-1",
          (open || active) && "text-deep-blue",
          active && "font-semibold",
        )}
      >
        <span>{label}</span>
        <FiChevronDown
          aria-hidden="true"
          size={14}
          className={cn(
            "text-charcoal/50 transition-transform duration-200",
            open && "rotate-180 text-emerald-brand",
          )}
        />
        {active ? (
          <PearlDot
            size="sm"
            tone="canary"
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2"
          />
        ) : null}
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        onKeyDown={onPanelKeyDown}
        className={cn(
          MENU_PANEL_CLASS,
          "left-1/2 -translate-x-1/2",
          variant === "rich" ? "w-96" : "w-56",
        )}
      >
        {heading ? (
          <p className="mb-1 border-b border-mint-mist px-3 pb-2 pt-1.5 text-[10px] font-bold uppercase tracking-museum text-charcoal/50">
            {heading}
          </p>
        ) : null}
        <ul>
          {items.map((item) => {
            const current = isNavItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  data-menu-item=""
                  aria-current={current ? "page" : undefined}
                  onClick={() => close()}
                  className={cn(
                    "group/item flex rounded-xl transition-colors hover:bg-soft-white focus-visible:bg-soft-white",
                    variant === "rich" ? "items-start gap-3 p-3" : "items-center gap-2 px-3 py-2",
                  )}
                >
                  {Icon ? (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-mint-mist text-emerald-brand transition-colors group-hover/item:bg-emerald-brand group-hover/item:text-soft-white">
                      <Icon aria-hidden="true" size={16} />
                    </span>
                  ) : null}
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "flex items-center gap-2 text-deep-blue transition-colors group-hover/item:text-emerald-brand",
                        variant === "rich"
                          ? "font-display text-sm font-semibold"
                          : "text-[13px] font-medium text-charcoal/85",
                        current && "font-semibold text-deep-blue",
                      )}
                    >
                      {item.title}
                      {current ? <PearlDot size="sm" tone="canary" /> : null}
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 block text-xs leading-snug text-charcoal/65">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
