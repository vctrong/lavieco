"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiShoppingBag } from "react-icons/fi";

import { TEXT } from "../constants/text";

/**
 * Cart icon with its count. A client island: the navbar stays static, the count comes
 * from `GET /api/cart` and is updated by the `lv:cart` event the shop pages send.
 */
export function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/cart")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { count?: number } | null) => {
        if (active && typeof body?.count === "number") setCount(body.count);
      })
      .catch(() => undefined);
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail;
      if (typeof detail === "number") setCount(detail);
    };
    window.addEventListener("lv:cart", onChange);
    return () => {
      active = false;
      window.removeEventListener("lv:cart", onChange);
    };
  }, []);

  return (
    <Link
      href="/gio-hang"
      aria-label={TEXT.vi.cart(count)}
      className="relative grid size-11 place-items-center rounded-full text-deep-blue hover:bg-mint-mist"
    >
      <FiShoppingBag aria-hidden="true" size={19} />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-emerald-brand px-1 text-[11px] font-bold text-charcoal"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
