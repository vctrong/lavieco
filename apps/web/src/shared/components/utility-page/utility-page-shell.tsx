import type { ReactNode } from "react";

import { cn, PearlDot } from "@lavieco/ui";

import { SITE_TEXT } from "@/shared/constants/text";

import { OrbitRings } from "./illustrations/orbit-rings";

type Backdrop = { kind: "numeral"; value: string } | { kind: "orbit" };

type UtilityPageShellProps = {
  backdrop: Backdrop;
  /** Museum-placard badge, e.g. "Nº 404 · LẠC LỐI BIỂN KHƠI · 2026". */
  badge: string;
  badgeTone?: "muted" | "white";
  /** Rendered above the badge (the coming-soon pearl). */
  above?: ReactNode;
  /** Provenance line under the content. Pass `false` to leave the footer out. */
  footer?: boolean;
  /** Extra provenance note under the footer line, such as the 500 reference code. */
  footerNote?: ReactNode;
  children: ReactNode;
};

const RING = "absolute rounded-full border border-deep-blue";

/**
 * Full-bleed frame shared by the utility pages (404, 500, coming soon): Soft White with a
 * faint ripple pattern, a hairline emerald/canary bar on top, ghost numeral or orbit rings,
 * concentric ripples, a placard badge and the provenance line.
 */
export function UtilityPageShell({
  backdrop,
  badge,
  badgeTone = "muted",
  above,
  footer = true,
  footerNote,
  children,
}: UtilityPageShellProps) {
  return (
    <>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-0.5 bg-emerald-brand">
        <div className="ml-auto h-full w-24 bg-canary" />
      </div>
      <div className="ripple-dots relative isolate flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-soft-white px-5 py-16 md:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center select-none"
        >
          {backdrop.kind === "numeral" ? (
            <>
              <span className="translate-y-4 font-display text-ghost leading-none font-light tracking-tighter text-deep-blue opacity-[0.04]">
                {backdrop.value}
              </span>
              <div className="absolute size-80 rounded-full bg-radial from-deep-blue/5 to-transparent md:size-170" />
              <div className={cn(RING, "size-125 opacity-5 md:size-235")} />
              <div className={cn(RING, "size-175 opacity-[0.03] md:size-310")} />
            </>
          ) : (
            <>
              <OrbitRings />
              <div className="absolute size-130 rounded-full bg-linear-to-tr from-emerald-brand/10 via-mint-mist/60 to-transparent blur-3xl" />
            </>
          )}
        </div>

        <main className="relative flex w-full max-w-4xl flex-col items-center text-center">
          {above}
          <p
            className={cn(
              "mb-8 inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-[11px] font-medium tracking-museum text-deep-blue uppercase shadow-sm",
              badgeTone === "white" ? "bg-white" : "bg-deep-blue/5",
            )}
          >
            <PearlDot
              size="sm"
              tone="emerald-flat"
              motion={badgeTone === "muted" ? "pulse" : "none"}
            />
            {badge}
          </p>
          {children}
        </main>

        {footer ? (
          <footer className="relative mt-16 flex flex-col items-center gap-3 text-center">
            <p className="flex items-center gap-3 text-[11px] font-medium tracking-[0.2em] text-deep-blue/70 uppercase">
              <span aria-hidden="true" className="h-px w-8 bg-deep-blue/20" />
              {SITE_TEXT.vi.utilityFooter}
              <span aria-hidden="true" className="h-px w-8 bg-deep-blue/20" />
            </p>
            {footerNote}
          </footer>
        ) : null}
      </div>
    </>
  );
}
