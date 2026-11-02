"use client";

import { useEffect, useState } from "react";
import { FiClock, FiCopy, FiTag } from "react-icons/fi";

import type { PublicVoucher } from "@lavieco/shared/events";

import { TEXT } from "../constants/text";
import { formatVnd } from "../utils/format";

const t = TEXT.vi.vouchers;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function timeLeft(endAt: string, now: number): string {
  const left = Date.parse(endAt) - now;
  if (left <= 0) return t.ended;
  if (left >= DAY_MS) return t.daysLeft(Math.floor(left / DAY_MS));
  if (left >= HOUR_MS) return t.hoursLeft(Math.floor(left / HOUR_MS));
  return t.minutesLeft(Math.max(1, Math.floor(left / MINUTE_MS)));
}

/**
 * "Ưu đãi đang có": public codes with uses left and a countdown. Whole minutes on
 * purpose: no ticking digits, nothing that moves for people who asked for less motion.
 */
export function VoucherStrip({ vouchers }: { vouchers: PublicVoucher[] }) {
  // Null until mounted: the server's clock must not produce a hydration mismatch.
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, MINUTE_MS);
    return () => clearInterval(timer);
  }, []);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      setCopied(null);
    }
  };

  return (
    <section aria-labelledby="uu-dai" className="rounded-pedestal bg-mint-mist p-5">
      <h2
        id="uu-dai"
        className="flex items-center gap-2 font-display text-headline-sm text-deep-blue"
      >
        <FiTag aria-hidden="true" size={16} />
        {t.title}
      </h2>
      <ul className="mt-3 space-y-3">
        {vouchers.map((voucher) => (
          <li key={voucher.code} className="rounded-2xl bg-white p-3 text-body-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono font-semibold tracking-wider text-deep-blue">
                {voucher.code}
              </span>
              <button
                type="button"
                onClick={() => void copy(voucher.code)}
                className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-meta text-deep-blue hover:bg-mint-mist"
              >
                <FiCopy aria-hidden="true" size={12} />
                {copied === voucher.code ? t.copied : t.copy}
              </button>
            </div>
            <p className="mt-1 text-charcoal/80">
              {voucher.discountType === "percent"
                ? t.offerPercent(
                    voucher.value,
                    voucher.maxDiscount ? formatVnd(voucher.maxDiscount) : null,
                  )
                : t.offerFixed(formatVnd(voucher.value))}
              {voucher.minSeats > 1 ? ` · ${t.minSeats(voucher.minSeats)}` : ""}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-3 text-meta text-charcoal/65">
              {voucher.remaining !== null ? <span>{t.remaining(voucher.remaining)}</span> : null}
              {voucher.endAt && now !== null ? (
                <span className="inline-flex items-center gap-1">
                  <FiClock aria-hidden="true" size={11} />
                  {timeLeft(voucher.endAt, now)}
                </span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
