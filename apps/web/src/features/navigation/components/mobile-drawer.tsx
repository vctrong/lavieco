"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { FiArrowRight, FiMenu, FiUser, FiX } from "react-icons/fi";

import { Button, PearlDot, cn } from "@lavieco/ui";

import { CTA_HREF, NAV_ITEMS, SIGN_IN_HREF } from "../constants/config";
import { TEXT } from "../constants/text";
import { useViewer } from "../hooks/viewer-store";
import { groupNavItems } from "../utils/group-nav-items";
import { isNavItemActive } from "../utils/is-nav-item-active";
import { AccountPanelBody, NeutralAccountLink, type LogoutAction } from "./account-menu";
import { BrandLogo } from "./brand-logo";
import { fullTitleOf } from "./nav-links";

const t = TEXT.vi;
const { inline: MAIN_ITEMS, explore: EXPLORE_ITEMS } = groupNavItems(NAV_ITEMS);
/** Tailwind `lg`: from here the bar shows its links and the drawer has no reason to stay open. */
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Full-height drawer below 1024px. A native modal <dialog> gives the focus trap, Esc
 * and an inert page for free; the body scroll is locked while it is open.
 */
export function MobileDrawer({ logoutAction }: { logoutAction: LogoutAction }) {
  const dialogId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = () => dialogRef.current?.close();

  const openDrawer = () => {
    dialogRef.current?.showModal();
    document.documentElement.style.overflow = "hidden";
    setOpen(true);
  };

  // Every way the dialog closes (button, link, Esc, resize) ends here.
  const handleClosed = () => {
    document.documentElement.style.overflow = "";
    setOpen(false);
    buttonRef.current?.focus();
  };

  // A link already closes it; this also covers back/forward navigation.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      if (query.matches) dialogRef.current?.close();
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [open]);

  // Never leave the page locked if the bar unmounts while open.
  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={t.drawer.openLabel}
        aria-expanded={open}
        aria-controls={dialogId}
        aria-haspopup="dialog"
        onClick={openDrawer}
        className="flex size-8 items-center justify-center rounded-full bg-deep-blue text-soft-white transition-colors hover:bg-emerald-brand lg:hidden"
      >
        <FiMenu aria-hidden="true" size={16} />
      </button>

      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-label={t.drawer.dialogLabel}
        onClose={handleClosed}
        className="fixed inset-0 m-0 size-full max-h-none max-w-none bg-soft-white p-0 text-charcoal opacity-0 transition-[opacity,translate,display,overlay] transition-discrete duration-300 ease-gallery backdrop:bg-transparent open:translate-y-0 open:opacity-100 starting:open:-translate-y-2 starting:open:opacity-0 lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <Link
              href="/"
              aria-label={t.homeLabel}
              onClick={close}
              className="flex items-center gap-2"
            >
              <BrandLogo className="h-6" />
              <PearlDot size="sm" tone="canary" />
            </Link>
            <button
              type="button"
              aria-label={t.drawer.closeLabel}
              onClick={close}
              className="flex size-9 items-center justify-center rounded-full bg-mint-mist text-deep-blue transition-colors hover:bg-emerald-brand hover:text-soft-white"
            >
              <FiX aria-hidden="true" size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
            <DrawerAccount logoutAction={logoutAction} onNavigate={close} />

            <nav aria-label={t.primaryNavLabel} className="mt-8">
              <ul className="space-y-4">
                {MAIN_ITEMS.map((item) => {
                  const active = isNavItemActive(pathname, item.href);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "inline-flex items-center gap-2.5 font-display text-3xl text-deep-blue transition-colors hover:text-emerald-brand",
                          active && "font-semibold",
                        )}
                      >
                        {t.items[item.id].label}
                        {active ? <PearlDot size="md" tone="canary" /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 border-t border-hairline pt-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-museum text-charcoal/50">
                  {t.drawer.exploreHeading}
                </p>
                <ul className="space-y-3">
                  {EXPLORE_ITEMS.map((item) => {
                    const active = isNavItemActive(pathname, item.href);
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={close}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2 text-sm font-medium text-charcoal/80 transition-colors hover:text-emerald-brand",
                            active && "font-semibold text-deep-blue",
                          )}
                        >
                          {fullTitleOf(item)}
                          {active ? <PearlDot size="sm" tone="canary" /> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </nav>
          </div>

          {/* Pinned to the bottom, above the home indicator on phones. */}
          <div className="border-t border-hairline bg-soft-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            <Button as={Link} href={CTA_HREF} onClick={close} className="w-full">
              {t.cta}
              <FiArrowRight aria-hidden="true" size={15} />
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function DrawerAccount({
  logoutAction,
  onNavigate,
}: {
  logoutAction: LogoutAction;
  onNavigate: () => void;
}) {
  const viewer = useViewer();
  const shell = "rounded-2xl border border-mint-mist bg-soft-white p-3 shadow-ambient";

  if (viewer.kind === "loading") {
    // Same height as the guest card: no jump when the viewer arrives.
    return (
      <div role="status" aria-label={t.account.loading} className={cn(shell, "h-[76px]")}>
        <div className="flex h-full items-center gap-3">
          <span className="size-10 animate-pulse rounded-full bg-mint-mist" />
          <span className="h-3 w-32 animate-pulse rounded-full bg-mint-mist" />
        </div>
      </div>
    );
  }
  if (viewer.kind === "unknown") {
    return (
      <div className={cn(shell, "flex items-center gap-3")}>
        <NeutralAccountLink />
        <span className="text-sm text-charcoal/70">{t.account.neutralLabel}</span>
      </div>
    );
  }
  if (viewer.kind === "guest") {
    return (
      <div className={cn(shell, "flex min-h-[76px] items-center justify-between gap-3")}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-deep-blue">{t.drawer.guestTitle}</p>
          <p className="text-xs text-charcoal/65">{t.drawer.guestBody}</p>
        </div>
        <Link
          href={SIGN_IN_HREF}
          onClick={onNavigate}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-mint-mist px-3 py-1.5 text-xs font-semibold text-deep-blue transition-colors hover:bg-emerald-brand hover:text-soft-white"
        >
          <FiUser aria-hidden="true" size={14} />
          {t.account.signIn}
        </Link>
      </div>
    );
  }
  return (
    <div className={shell}>
      <AccountPanelBody viewer={viewer} logoutAction={logoutAction} onNavigate={onNavigate} />
    </div>
  );
}
