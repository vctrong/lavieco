"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import { nextFocusIndex, openingFocusIndex } from "../utils/menu-keys";

const ITEM_SELECTOR = "[data-menu-item]";

/**
 * Disclosure menu (button + panel of links, WAI-ARIA "disclosure navigation"):
 * Enter/Space toggle (native button), ArrowDown/ArrowUp open on the first/last link,
 * arrows/Home/End move inside, Esc closes and returns focus to the button, Tab away,
 * a click outside or a navigation closes it.
 */
export function useDisclosure() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const items = () =>
    Array.from(panelRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Close on navigation. Adjusting state while rendering (not in an effect) avoids a
  // frame where the old menu stays open on the new page.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const focusItem = (index: number) => {
    // A panel that was just opened is still `hidden` until React commits; wait a frame.
    requestAnimationFrame(() => items()[index]?.focus());
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
      return;
    }
    // The panel stays mounted (hidden while closed), so its links can be counted.
    const count = items().length;
    const index = open ? nextFocusIndex(event.key, -1, count) : openingFocusIndex(event.key, count);
    if (index === null) return;
    event.preventDefault();
    setOpen(true);
    focusItem(index);
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    const list = items();
    const current = list.indexOf(document.activeElement as HTMLElement);
    const index = nextFocusIndex(event.key, current, list.length);
    if (index === null) return;
    event.preventDefault();
    list[index]?.focus();
  };

  /** Tab moving focus out of the whole menu closes it. */
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && !rootRef.current?.contains(next)) setOpen(false);
  };

  return {
    open,
    toggle: () => setOpen((value) => !value),
    close,
    rootRef,
    triggerRef,
    panelRef,
    onTriggerKeyDown,
    onPanelKeyDown,
    onBlur,
  };
}
