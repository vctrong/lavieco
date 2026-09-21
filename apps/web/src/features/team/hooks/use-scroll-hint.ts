"use client";

import { useEffect, useState, type RefObject } from "react";

/** True while `ref` can still be scrolled down: drives the fade hint at its bottom edge. */
export function useScrollHint(ref: RefObject<HTMLElement | null>): boolean {
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () =>
      setHasMore(element.scrollHeight - element.scrollTop - element.clientHeight > 4);

    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [ref]);

  return hasMore;
}
