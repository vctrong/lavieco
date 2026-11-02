"use client";

import { useState } from "react";
import { FiTag, FiX } from "react-icons/fi";

import type { PublicVoucher, VoucherCheckResponse } from "@lavieco/shared/events";

import { callAction } from "@/shared/call-action";

import { checkVoucher } from "../actions/voucher";
import { TEXT } from "../constants/text";
import { formatVnd } from "../utils/format";

const t = TEXT.vi.voucher;

export const voucherOffer = (
  voucher: Pick<PublicVoucher, "discountType" | "value" | "maxDiscount">,
) =>
  voucher.discountType === "percent"
    ? t.offerPercent(voucher.value, voucher.maxDiscount ? formatVnd(voucher.maxDiscount) : null)
    : t.offerFixed(formatVnd(voucher.value));

type VoucherFieldProps = {
  eventSlug: string;
  items: { ticketTypeId: string; quantity: number }[];
  email: string;
  available: PublicVoucher[];
  applied: VoucherCheckResponse | null;
  onChange: (applied: VoucherCheckResponse | null) => void;
  disabled: boolean;
};

/** One code per order (BR-18). The service prices it; the order checks it again. */
export function VoucherField(props: VoucherFieldProps) {
  const { eventSlug, items, email, available, applied, onChange, disabled } = props;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  const apply = async (typed: string) => {
    if (!typed.trim()) return;
    setBusy(true);
    setMessage(null);
    const result = await callAction(() =>
      checkVoucher({ eventSlug, items, code: typed, email: email.trim() || undefined }),
    );
    setBusy(false);
    if (result.status === "ok") {
      onChange(result.data);
      setCode("");
      setChoosing(false);
      return;
    }
    onChange(null);
    setMessage(t.errors[result.reason]);
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-mint-mist px-4 py-3 text-[13.5px] text-deep-blue">
        <span className="flex min-w-0 items-center gap-2">
          <FiTag aria-hidden="true" size={14} className="shrink-0" />
          <span className="font-semibold tracking-wider">{applied.code}</span>
          <span className="truncate text-charcoal/75">{applied.name}</span>
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className="inline-flex shrink-0 items-center gap-1 font-medium underline-offset-4 hover:underline"
        >
          <FiX aria-hidden="true" size={13} />
          {t.remove}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="ma-uu-dai" className="block text-[12px] font-semibold text-deep-blue">
        {t.label}
      </label>
      <div className="flex gap-2">
        <input
          id="ma-uu-dai"
          value={code}
          maxLength={30}
          autoComplete="off"
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            // Inside the checkout form: Enter applies the code, it must not submit the order.
            if (event.key === "Enter") {
              event.preventDefault();
              void apply(code);
            }
          }}
          disabled={disabled || busy}
          className="min-w-0 flex-1 rounded-full border border-hairline bg-white px-4 py-2 text-[14px] uppercase tracking-wider text-deep-blue focus-visible:outline-2 focus-visible:outline-emerald-brand"
        />
        <button
          type="button"
          disabled={disabled || busy || items.length === 0 || !code.trim()}
          onClick={() => void apply(code)}
          className="shrink-0 rounded-full bg-deep-blue px-4 py-2 text-[13px] font-semibold text-soft-white disabled:opacity-50"
        >
          {busy ? t.applying : t.apply}
        </button>
      </div>
      {available.length > 0 ? (
        <button
          type="button"
          aria-expanded={choosing}
          onClick={() => setChoosing((open) => !open)}
          className="text-[12.5px] font-medium text-emerald-ink underline-offset-4 hover:underline"
        >
          {t.choose}
        </button>
      ) : null}
      {choosing ? (
        <ul className="space-y-2">
          {available.map((voucher) => (
            <li key={voucher.code}>
              <button
                type="button"
                disabled={disabled || busy || items.length === 0}
                onClick={() => void apply(voucher.code)}
                className="w-full rounded-2xl border border-hairline p-3 text-left text-[13px] hover:bg-mint-mist disabled:opacity-50"
              >
                <span className="font-semibold tracking-wider text-deep-blue">{voucher.code}</span>
                <span className="ml-2 text-charcoal/75">{voucherOffer(voucher)}</span>
                {voucher.remaining !== null ? (
                  <span className="mt-0.5 block text-[12px] text-charcoal/60">
                    {t.remaining(voucher.remaining)}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-[12px] leading-relaxed text-charcoal/60">{t.hint}</p>
      {message ? (
        <p role="alert" className="text-[12.5px] font-medium text-error">
          {message}
        </p>
      ) : null}
    </div>
  );
}
