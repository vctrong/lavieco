"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { DOCK_SHRINK_SCROLL_Y, SESSION_PAGES } from "../constants/config";
import { subscribeScroll } from "../hooks/scroll-store";
import { loadViewer } from "../hooks/viewer-store";

const HEADER =
  "fixed left-1/2 top-4 z-40 w-[calc(100%-2rem)] max-w-[960px] -translate-x-1/2 lg:top-5 xl:max-w-[1120px]";
const PILL =
  "group/pill grid h-14 grid-cols-[1fr_auto] items-center gap-4 rounded-full border border-mint-mist bg-soft-white/95 px-4 shadow-dock backdrop-blur-md transition-[height,background-color,box-shadow] duration-300 ease-gallery data-[scrolled=true]:h-12 data-[scrolled=true]:bg-soft-white/85 data-[scrolled=true]:shadow-dock-scrolled lg:h-16 lg:grid-cols-[1fr_auto_1fr] lg:px-6 lg:data-[scrolled=true]:h-[52px]";
/**
 * Full-screen tools: 48px from the top edge on phones (56px on desktop) and never
 * shrinking (the page itself does not scroll). The page pads by the same amount.
 */
const COMPACT_HEADER =
  "fixed left-1/2 top-2 z-40 w-[calc(100%-1rem)] max-w-[1120px] -translate-x-1/2 lg:top-3 lg:w-[calc(100%-2rem)]";
const COMPACT_PILL =
  "group/pill grid h-12 grid-cols-[1fr_auto] items-center gap-3 rounded-full border border-mint-mist bg-soft-white/95 px-3 shadow-dock backdrop-blur-md lg:h-14 lg:grid-cols-[1fr_auto_1fr] lg:px-5";

const isSessionPage = (pathname: string) =>
  SESSION_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));

/**
 * The floating pill. Flags `data-scrolled` for the compact state (CSS does the rest),
 * and asks the viewer again after leaving a page that signs in or out: the layout,
 * and so the account cluster, survives client-side navigations.
 */
export function NavbarShell({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  const pillRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(
    () =>
      subscribeScroll(({ scrollY }) => {
        pillRef.current?.setAttribute("data-scrolled", String(scrollY > DOCK_SHRINK_SCROLL_Y));
      }),
    [],
  );

  useEffect(() => {
    const previous = previousPath.current;
    previousPath.current = pathname;
    if (previous !== pathname && isSessionPage(previous)) loadViewer();
  }, [pathname]);

  return (
    <header className={compact ? COMPACT_HEADER : HEADER}>
      <div ref={pillRef} data-scrolled="false" className={compact ? COMPACT_PILL : PILL}>
        {children}
      </div>
    </header>
  );
}
