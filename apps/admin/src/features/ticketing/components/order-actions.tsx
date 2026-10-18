"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FiCheckCircle, FiMail, FiRefreshCw, FiRotateCcw } from "react-icons/fi";

import { Button, TextField, TextareaField } from "@lavieco/ui";

import { markRefunded, reconcileOrder, resendTickets } from "../actions/orders";
import { TEXT } from "../constants/text";
import type { ActionResult } from "../types";
import { FormAlert } from "./form-alert";

type OrderActionsProps = {
  orderId: string;
  revision: number;
  canReconcile: boolean;
  canResend: boolean;
  canRefund: boolean;
};

/** "Kiểm tra lại thanh toán", "Gửi lại vé" and "Đánh dấu đã hoàn tiền" (step-up). */
export function OrderActions({
  orderId,
  revision,
  canReconcile,
  canResend,
  canRefund,
}: OrderActionsProps) {
  const t = TEXT.vi;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const run = async (action: () => Promise<ActionResult<unknown>>, success: string) => {
    setBusy(true);
    setAlert(null);
    setNotice(null);
    const result = await action().catch(() => null);
    setBusy(false);
    if (!result) return (setAlert(t.errors.unavailable), false);
    if (result.status === "invalid") return (setErrors(result.fieldErrors), false);
    if (result.status === "error") return (setAlert(t.errors[result.reason]), false);
    setNotice(success);
    router.refresh();
    return true;
  };

  const handleRefund = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setErrors({});
    const done = await run(
      () =>
        markRefunded({
          orderId,
          revision,
          note: String(form.get("note") ?? ""),
          code: String(form.get("code") ?? ""),
        }),
      t.detail.actions.refunded,
    );
    if (done) setRefunding(false);
  };

  return (
    <section className="space-y-4 rounded-3xl border border-hairline bg-white p-5">
      <div className="flex flex-wrap gap-2">
        {canReconcile ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => run(() => reconcileOrder(orderId), t.detail.actions.reconciled)}
          >
            <FiRefreshCw aria-hidden="true" size={14} />
            {t.detail.actions.reconcile}
          </Button>
        ) : null}
        {canResend ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => run(() => resendTickets(orderId), t.detail.actions.resent)}
          >
            <FiMail aria-hidden="true" size={14} />
            {t.detail.actions.resend}
          </Button>
        ) : null}
        {canRefund && !refunding ? (
          <Button
            type="button"
            variant="deep"
            size="sm"
            disabled={busy}
            onClick={() => setRefunding(true)}
          >
            <FiRotateCcw aria-hidden="true" size={14} />
            {t.detail.actions.refund}
          </Button>
        ) : null}
      </div>

      {refunding ? (
        <form
          onSubmit={handleRefund}
          noValidate
          className="space-y-4 rounded-2xl bg-mint-mist/60 p-4"
        >
          <h3 className="font-display text-lg text-deep-blue">{t.detail.actions.refundTitle}</h3>
          <p className="text-[13px] leading-relaxed text-charcoal/75">
            {t.detail.actions.refundIntro}
          </p>
          <TextareaField
            tone="light"
            rows={2}
            name="note"
            label={t.detail.actions.refundNote}
            maxLength={500}
            error={errors.note}
            disabled={busy}
          />
          <TextField
            tone="light"
            name="code"
            label={t.stepUp.code}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            error={errors.code}
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="deep" size="sm" disabled={busy}>
              <FiCheckCircle aria-hidden="true" size={14} />
              {t.detail.actions.refundConfirm}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setRefunding(false)}>
              {t.detail.actions.cancel}
            </Button>
          </div>
        </form>
      ) : null}

      <FormAlert tone="success" message={notice} />
      <FormAlert message={alert} />
    </section>
  );
}
