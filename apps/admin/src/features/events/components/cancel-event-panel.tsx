"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FiSlash } from "react-icons/fi";

import { EVENT_LIMITS, type EventCancelImpact, type EventView } from "@lavieco/shared/events";
import { Button, FormAlert, TextareaField, TextField } from "@lavieco/ui";

import { cancelEvent, getCancelImpact } from "../actions/events";
import { TEXT } from "../constants/text";
import { callAction } from "@/shared/call-action";
import { failureText } from "../utils/failure-text";

const t = TEXT.vi;

/** A published or closed standard event that has not ended can still be cancelled. */
export const canCancel = (event: EventView, now = Date.now()) =>
  event.kind === "standard" &&
  (event.status === "published" || event.status === "closed") &&
  Date.parse(event.endAt) > now;

/**
 * "Huỷ chương trình": shows what it touches, asks for the public reason and a fresh
 * TOTP code (step-up). Final: the service voids tickets and settles the orders.
 */
export function CancelEventPanel({ event, disabled }: { event: EventView; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<EventCancelImpact | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);

  const start = async () => {
    setOpen(true);
    setAlert(null);
    const result = await callAction(() => getCancelImpact(event.id));
    if (result.status === "ok") setImpact(result.data);
    else if (result.status === "error") setAlert(failureText(result));
  };

  const submit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (busy) return;
    const form = new FormData(formEvent.currentTarget);
    setBusy(true);
    setAlert(null);
    const result = await callAction(() =>
      cancelEvent(event.id, {
        revision: event.revision,
        reason: String(form.get("reason") ?? ""),
        code: String(form.get("code") ?? ""),
      }),
    );
    setBusy(false);
    if (result.status === "ok") {
      setOpen(false);
      router.refresh();
      return;
    }
    if (result.status === "invalid") {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    setAlert(failureText(result));
  };

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        onClick={start}
        className="w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FiSlash aria-hidden="true" size={13} />
        {t.actions.cancel}
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-3 rounded-2xl border border-charcoal/20 bg-soft-white p-3"
    >
      <p className="font-display text-base text-deep-blue">{t.actions.cancelTitle}</p>
      <p className="text-[12.5px] leading-relaxed text-charcoal/75">{t.actions.cancelIntro}</p>
      {impact ? (
        <p role="status" className="text-[12.5px] font-medium text-deep-blue">
          {t.actions.cancelImpact(impact.paidOrders, impact.pendingOrders, impact.validTickets)}
        </p>
      ) : null}
      <TextareaField
        tone="light"
        rows={3}
        name="reason"
        label={t.actions.cancelReason}
        maxLength={EVENT_LIMITS.cancelReasonMax}
        error={errors.reason}
        disabled={busy}
      />
      <TextField
        tone="light"
        name="code"
        label={t.actions.cancelCode}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        error={errors.code}
        disabled={busy}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="deep" disabled={busy}>
          {busy ? t.editor.saving : t.actions.cancelConfirm}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => setOpen(false)}
        >
          {t.actions.no}
        </Button>
      </div>
      <FormAlert message={alert} />
    </form>
  );
}
