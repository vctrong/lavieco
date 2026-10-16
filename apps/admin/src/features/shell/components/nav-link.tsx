"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";

type NavLinkProps = { href: string; label: string; available: boolean };

/** Sidebar entry; screens not built yet are shown, marked "coming soon", not linked. */
export function NavLink({ href, label, available }: NavLinkProps) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const base =
    "flex items-center justify-between rounded-full px-4 py-2 text-[13.5px] transition-colors";

  if (!available) {
    return (
      <span aria-disabled="true" className={cn(base, "cursor-default text-charcoal/40")}>
        {label}
        <span className="rounded-full bg-mint-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-museum text-deep-blue/60">
          {TEXT.vi.soon}
        </span>
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        base,
        active
          ? "bg-emerald-brand font-semibold text-deep-blue shadow-emerald-cta-sm"
          : "text-charcoal/80 hover:bg-mint-mist hover:text-deep-blue",
      )}
    >
      {label}
    </Link>
  );
}
