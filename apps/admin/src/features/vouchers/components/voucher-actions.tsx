"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiArchive, FiCopy, FiPause, FiPlay } from "react-icons/fi";

import type { VoucherStatus, VoucherView } from "@lavieco/shared/events";
import { FormAlert } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { duplicateVoucher, setVoucherStatus } from "../actions/vouchers";
import { TEXT } from "../constants/text";

const t = TEXT.vi;
const ACTION =
  "inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist disabled:opacity-50";

/** Pause, resume, archive and duplicate; the list and the detail page share them. */
export function VoucherActions({ voucher }: { voucher: VoucherView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  const status = async (next: VoucherStatus) => {
    setBusy(true);
    setAlert(null);
    const result = await callAction(() =>
      setVoucherStatus(voucher.id, { status: next, revision: voucher.revision }),
    );
    setBusy(false);
    if (result.status === "ok") router.refresh();
    else setAlert(result.status === "error" ? t.errors[result.reason] : t.errors.invalid);
  };
  const copy = async () => {
    setBusy(true);
    setAlert(null);
    const result = await callAction(() => duplicateVoucher(voucher.id));
    setBusy(false);
    if (result.status === "ok") router.push(`/vouchers/${result.data.id}`);
    else setAlert(result.status === "error" ? t.errors[result.reason] : t.errors.invalid);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {voucher.status === "active" ? (
          <button type="button" className={ACTION} disabled={busy} onClick={() => status("paused")}>
            <FiPause aria-hidden="true" size={13} />
            {t.pause}
          </button>
        ) : (
          <button type="button" className={ACTION} disabled={busy} onClick={() => status("active")}>
            <FiPlay aria-hidden="true" size={13} />
            {t.resume}
          </button>
        )}
        <button type="button" className={ACTION} disabled={busy} onClick={copy}>
          <FiCopy aria-hidden="true" size={13} />
          {t.duplicate}
        </button>
        {voucher.status !== "archived" ? (
          <button
            type="button"
            className={ACTION}
            disabled={busy}
            onClick={() => status("archived")}
          >
            <FiArchive aria-hidden="true" size={13} />
            {t.archive}
          </button>
        ) : null}
      </div>
      <FormAlert message={alert} />
    </div>
  );
}
