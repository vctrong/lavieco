import Link from "next/link";

import { Button, PearlDot } from "@lavieco/ui";

import { CTA_HREF } from "../constants/config";
import { TEXT } from "../constants/text";
import { AccountButton, AccountMenu, type LogoutAction } from "./account-menu";
import { BrandLogo } from "./brand-logo";
import { MobileDrawer } from "./mobile-drawer";
import { NavbarShell } from "./navbar-shell";
import { NavLinks } from "./nav-links";

type NavbarProps = {
  /** Sign-out Server Action, handed over by the layout. */
  logoutAction: LogoutAction;
};

/**
 * Site navigation (docs/design/new navbar). Rendered on the server without reading the
 * session, so static pages stay static: the account cluster is a client island that
 * shows a same-size skeleton until `GET /api/account/viewer` answers.
 *
 * ≥1280px every link · 1024–1279px secondary links in "Thêm" · <1024px logo, account
 * and a drawer with the CTA pinned at the bottom.
 */
export function Navbar({ logoutAction }: NavbarProps) {
  const t = TEXT.vi;
  return (
    <NavbarShell>
      <Link
        href="/"
        aria-label={t.homeLabel}
        className="group flex items-center gap-2 justify-self-start rounded-full py-1 pr-2"
      >
        <BrandLogo className="h-6 transition-[height,opacity] duration-300 group-hover:opacity-80 group-data-[scrolled=true]/pill:h-5" />
        <PearlDot size="sm" tone="canary" />
      </Link>

      <NavLinks />

      <div className="flex items-center gap-2.5 justify-self-end lg:gap-4">
        <span aria-hidden="true" className="hidden h-6 w-px bg-hairline lg:block" />
        <div className="hidden lg:block">
          <AccountMenu logoutAction={logoutAction} />
        </div>
        <div className="lg:hidden">
          <AccountButton />
        </div>
        <span aria-hidden="true" className="h-5 w-px bg-hairline lg:hidden" />
        {/* Wrapped: `cn` does not merge classes, so `hidden` cannot override the button's display. */}
        <div className="hidden lg:block">
          <Button as={Link} href={CTA_HREF} size="sm" className="whitespace-nowrap">
            {t.navbar.ctaShort}
          </Button>
        </div>
        <MobileDrawer logoutAction={logoutAction} />
      </div>
    </NavbarShell>
  );
}
