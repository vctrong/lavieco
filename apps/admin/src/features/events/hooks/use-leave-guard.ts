"use client";

import { useEffect, useState } from "react";

/**
 * Warns before unsaved changes are lost: the browser's own prompt for a reload or a
 * closed tab, and `leavingTo` for a click on an in-app link, because the App Router
 * offers no navigation guard. New-tab clicks and anchors on this page pass through.
 */
export function useLeaveGuard(dirty: boolean) {
  const [leavingTo, setLeavingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;
      event.preventDefault();
      event.stopPropagation();
      setLeavingTo(`${url.pathname}${url.search}`);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);

  return { leavingTo, stay: () => setLeavingTo(null) };
}
