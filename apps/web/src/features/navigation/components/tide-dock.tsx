"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button, PearlDot, cn } from "@lavieco/ui";

import { CTA_HREF, DOCK_SHRINK_SCROLL_Y, NAV_ITEMS } from "../constants/config";
import { TEXT } from "../constants/text";
import { subscribeScroll } from "../hooks/scroll-store";
import { isNavItemActive } from "../utils/is-nav-item-active";
import { BrandLogo } from "./brand-logo";
import { CatalogueOverlay } from "./catalogue-overlay";

const CATALOGUE_DIALOG_ID = "catalogue-dialog";

/** Floating frosted-capsule navigation ("Tide Dock", design.md §8.2). */
export function TideDock() {
  const t = TEXT.vi;
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(
    () =>
      subscribeScroll(({ scrollY, progress }) => {
        dockRef.current?.setAttribute("data-scrolled", String(scrollY > DOCK_SHRINK_SCROLL_Y));
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
      }),
    [],
  );

  const openMenu = () => {
    dialogRef.current?.showModal();
    document.body.style.overflow = "hidden";
    setMenuOpen(true);
  };

  // Runs for every way the dialog can close (button, link click, Esc).
  const handleClosed = () => {
    document.body.style.overflow = "";
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    <>
      <header className="fixed left-1/2 top-5 z-40 w-[92%] max-w-[960px] -translate-x-1/2">
        <div
          ref={dockRef}
          data-scrolled="false"
          className="relative flex items-center justify-between rounded-full border border-hairline bg-soft-white/80 px-5 py-2.5 shadow-dock backdrop-blur-md transition-all duration-300 data-[scrolled=true]:py-2 data-[scrolled=true]:shadow-dock-scrolled"
        >
          <Link href="/" aria-label={t.homeLabel} className="group flex items-center gap-2">
            <BrandLogo className="h-6 transition-opacity group-hover:opacity-80" />
            <PearlDot size="sm" tone="canary" />
          </Link>

          <nav
            aria-label={t.primaryNavLabel}
            className="relative hidden items-center gap-5 text-[13.5px] xl:gap-6 font-medium text-charcoal/85 lg:flex"
          >
            {NAV_ITEMS.map((item) => {
              const copy = t.items[item.id as keyof typeof t.items];
              const active = isNavItemActive(pathname, item.href);
              const tooltipId = `nav-hint-${item.id}`;
              return (
                <div key={item.id} className="group/nav relative py-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-describedby={tooltipId}
                    className={cn(
                      "flex items-center gap-1.5 transition-colors hover:text-deep-blue",
                      active && "font-semibold text-deep-blue",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1 rounded-full bg-canary transition-opacity group-focus-within/nav:opacity-100 group-hover/nav:opacity-100",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span>{copy.label}</span>
                  </Link>
                  <span
                    id={tooltipId}
                    role="tooltip"
                    className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-deep-blue px-3 py-1 font-display text-[11px] italic text-soft-white opacity-0 shadow-lg transition-all duration-200 group-focus-within/nav:opacity-100 group-hover/nav:opacity-100"
                  >
                    {copy.hint}
                  </span>
                </div>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            <Button as={Link} href={CTA_HREF} size="sm" className="hidden sm:inline-flex">
              {t.cta}
            </Button>
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={t.menu.openLabel}
              aria-expanded={menuOpen}
              aria-controls={CATALOGUE_DIALOG_ID}
              aria-haspopup="dialog"
              onClick={openMenu}
              className="group flex size-8 flex-col items-center justify-center gap-1 rounded-full border border-hairline bg-soft-white transition-colors hover:border-deep-blue"
            >
              <span className="h-[1.5px] w-3.5 bg-deep-blue transition-all group-hover:w-4" />
              <span className="h-[1.5px] w-2.5 bg-deep-blue transition-all group-hover:w-4" />
            </button>
          </div>

          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden rounded-b-full bg-emerald-brand/30"
          >
            <div
              ref={progressRef}
              className="h-full origin-left scale-x-0 bg-emerald-brand/85 will-change-transform"
            />
          </div>
        </div>
      </header>

      <CatalogueOverlay id={CATALOGUE_DIALOG_ID} dialogRef={dialogRef} onClosed={handleClosed} />
    </>
  );
}
