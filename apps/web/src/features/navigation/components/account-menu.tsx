"use client";

import Link from "next/link";
import { useId } from "react";
import { FiCalendar, FiLogOut, FiSettings, FiTag, FiUser } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { ACCOUNT_HREF, ACCOUNT_LINKS, SIGN_IN_HREF } from "../constants/config";
import { TEXT } from "../constants/text";
import { markSignedOut, useViewer } from "../hooks/viewer-store";
import { useDisclosure } from "../hooks/use-disclosure";
import type { AccountLink, SignedInViewer } from "../types";
import { MENU_PANEL_CLASS, MENU_ROW_CLASS } from "./styles";
import { UserAvatar } from "./user-avatar";

const t = TEXT.vi.account;

export const ACCOUNT_ICONS: Record<AccountLink["id"], typeof FiUser> = {
  tickets: FiTag,
  registrations: FiCalendar,
  profile: FiUser,
};

/** Server Action signing the member out (passed down by the layout: features do not import each other). */
export type LogoutAction = () => Promise<void>;

/**
 * Width reserved for the desktop account slot whatever it shows (skeleton, "Đăng nhập",
 * avatar): the bar never shifts when the viewer arrives.
 */
const SLOT_CLASS = "flex w-28 items-center justify-end";

/** Desktop account cluster (≥1024px): skeleton → "Đăng nhập" or avatar menu. */
export function AccountMenu({ logoutAction }: { logoutAction: LogoutAction }) {
  const viewer = useViewer();

  if (viewer.kind === "loading") {
    return (
      <div className={SLOT_CLASS} role="status" aria-label={t.loading}>
        <span className="h-8 w-24 animate-pulse rounded-full bg-mint-mist" />
      </div>
    );
  }
  if (viewer.kind === "unknown") {
    return (
      <div className={SLOT_CLASS}>
        <NeutralAccountLink />
      </div>
    );
  }
  if (viewer.kind === "guest") {
    return (
      <div className={SLOT_CLASS}>
        <Link
          href={SIGN_IN_HREF}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-deep-blue transition-colors hover:bg-mint-mist/60 hover:text-emerald-brand"
        >
          <FiUser aria-hidden="true" size={16} className="text-deep-blue/80" />
          {t.signIn}
        </Link>
      </div>
    );
  }
  return (
    <div className={SLOT_CLASS}>
      <SignedInMenu viewer={viewer} logoutAction={logoutAction} />
    </div>
  );
}

/** Session present but not readable right now (no Web Locks, service down): no name, no photo. */
export function NeutralAccountLink() {
  return (
    <Link
      href={ACCOUNT_HREF}
      aria-label={t.neutralLabel}
      className="flex size-8 items-center justify-center rounded-full border border-hairline bg-soft-white text-deep-blue transition-colors hover:border-emerald-brand"
    >
      <FiUser aria-hidden="true" size={15} />
    </Link>
  );
}

function SignedInMenu({
  viewer,
  logoutAction,
}: {
  viewer: SignedInViewer;
  logoutAction: LogoutAction;
}) {
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

  return (
    <div ref={rootRef} onBlur={onBlur} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t.menuLabel(viewer.displayName)}
        onClick={toggle}
        onKeyDown={onTriggerKeyDown}
        className="flex rounded-full"
      >
        <UserAvatar viewer={viewer} ringed />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        onKeyDown={onPanelKeyDown}
        className={cn(MENU_PANEL_CLASS, "right-0 w-72")}
      >
        <AccountPanelBody viewer={viewer} logoutAction={logoutAction} onNavigate={() => close()} />
      </div>
    </div>
  );
}

/** Header, links and sign-out; shared by the desktop menu and the mobile drawer. */
export function AccountPanelBody({
  viewer,
  logoutAction,
  onNavigate,
}: {
  viewer: SignedInViewer;
  logoutAction: LogoutAction;
  onNavigate: () => void;
}) {
  const isAdmin = viewer.kind === "admin";
  return (
    <>
      <div className="mb-2 flex items-center gap-3 rounded-xl border border-mint-mist bg-mint-mist/40 p-3">
        <UserAvatar viewer={viewer} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-deep-blue">{viewer.displayName}</p>
          <p className="truncate text-xs text-charcoal/60">{viewer.email}</p>
        </div>
        {isAdmin ? (
          <span className="shrink-0 rounded-full bg-deep-blue px-2 py-0.5 text-[9px] font-bold uppercase tracking-museum text-canary">
            {t.adminBadge}
          </span>
        ) : null}
      </div>

      {viewer.kind === "admin" ? (
        <a
          href={viewer.adminUrl}
          target="_blank"
          rel="noreferrer"
          data-menu-item=""
          onClick={onNavigate}
          className="mb-2 flex items-center gap-2.5 rounded-xl border border-emerald-brand/20 bg-mint-mist/70 px-3 py-2.5 text-xs font-semibold text-deep-blue transition-colors hover:bg-mint-mist"
        >
          <FiSettings aria-hidden="true" size={16} className="text-emerald-brand" />
          {t.admin}
          <span className="sr-only">{t.adminNewTab}</span>
        </a>
      ) : null}

      <ul className="space-y-0.5">
        {ACCOUNT_LINKS.map((link) => {
          const Icon = ACCOUNT_ICONS[link.id];
          return (
            <li key={link.id}>
              <Link
                href={link.href}
                data-menu-item=""
                onClick={onNavigate}
                className={MENU_ROW_CLASS}
              >
                <Icon
                  aria-hidden="true"
                  size={16}
                  className={link.id === "tickets" ? "text-emerald-brand" : "text-deep-blue/60"}
                />
                {t.links[link.id]}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="my-2 border-t border-mint-mist" />

      {/* A plain form: signing out works before hydration too. The guest state is shown on
          the next tick, once React has sent the action (unmounting the form earlier would
          race it). */}
      <form action={logoutAction} onSubmit={() => setTimeout(markSignedOut, 0)}>
        <button
          type="submit"
          data-menu-item=""
          className={cn(MENU_ROW_CLASS, "w-full text-charcoal")}
        >
          <FiLogOut aria-hidden="true" size={16} />
          {t.signOut}
        </button>
      </form>
    </>
  );
}

/** Mobile pill (<1024px): a 32px slot holding the avatar, the sign-in icon or a skeleton. */
export function AccountButton() {
  const viewer = useViewer();
  if (viewer.kind === "loading") {
    return (
      <span
        role="status"
        aria-label={t.loading}
        className="size-8 animate-pulse rounded-full bg-mint-mist"
      />
    );
  }
  if (viewer.kind === "unknown") return <NeutralAccountLink />;
  if (viewer.kind === "guest") {
    return (
      <Link
        href={SIGN_IN_HREF}
        aria-label={t.signIn}
        className="flex size-8 items-center justify-center rounded-full bg-mint-mist text-emerald-brand ring-1 ring-emerald-brand/40 transition-colors hover:bg-emerald-brand hover:text-soft-white"
      >
        <FiUser aria-hidden="true" size={16} />
      </Link>
    );
  }
  return (
    <Link
      href={ACCOUNT_HREF}
      aria-label={t.menuLabel(viewer.displayName)}
      className="flex rounded-full"
    >
      <UserAvatar viewer={viewer} />
    </Link>
  );
}
