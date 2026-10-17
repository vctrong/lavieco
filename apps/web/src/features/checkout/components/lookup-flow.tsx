"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { FiArrowRight, FiMail } from "react-icons/fi";

import type { TicketLookupResponse } from "@lavieco/shared/events";
import { Button, TextField } from "@lavieco/ui";

import { FormAlert } from "@/shared/components/form-alert";
import { HoneypotField } from "@/shared/components/honeypot-field";
import { OtpInput } from "@/shared/components/otp-input";
import { TurnstileWidget } from "@/shared/components/turnstile-widget";
import { useCountdown } from "@/shared/hooks/use-countdown";

import { requestLookupCode, verifyLookup } from "../actions/lookup";
import { CHECKOUT_ROUTES } from "../constants/config";
import { TEXT } from "../constants/text";
import { formatDate } from "../utils/format";
import { messageFor } from "./messages";

type Pending = { email: string; challengeId: string; resendAvailableAt: string };

/** `/tra-cuu-ve`: email → 6-digit code → every paid order of that email (docs/05 §5.4). */
export function LookupFlow({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const t = TEXT.vi;
  const hintId = useId();
  const [pending, setPending] = useState<Pending | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [alert, setAlert] = useState<string | null>(null);
  const [result, setResult] = useState<TicketLookupResponse["items"] | null>(null);
  const resendIn = useCountdown(pending?.resendAvailableAt ?? null);

  const sendCode = async (values: Record<string, unknown>) => {
    setBusy(true);
    setAlert(null);
    const sent = await requestLookupCode(values).catch(() => null);
    setBusy(false);
    if (!sent) return setAlert(t.errors.unavailable);
    if (sent.status === "invalid") return setEmailError(sent.fieldErrors.email);
    if (sent.status === "error") return setAlert(messageFor(sent));
    setEmailError(undefined);
    setCode("");
    setPending({
      email: String(values.email),
      challengeId: sent.challengeId,
      resendAvailableAt: sent.resendAvailableAt,
    });
  };

  const handleEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    await sendCode(Object.fromEntries(new FormData(event.currentTarget)));
  };

  const handleCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !pending) return;
    if (!/^\d{6}$/.test(code)) return setAlert(t.errors.codeFormat);
    setBusy(true);
    setAlert(null);
    const found = await verifyLookup({ challengeId: pending.challengeId, code }).catch(() => null);
    setBusy(false);
    if (!found) return setAlert(t.errors.unavailable);
    if (found.status === "invalid") return setAlert(t.errors.codeFormat);
    if (found.status === "error") return setAlert(messageFor(found));
    setResult(found.items);
  };

  if (result) {
    return (
      <div className="space-y-5 rounded-3xl border border-hairline bg-white p-6 md:p-8">
        <h2 className="font-display text-2xl text-deep-blue">{t.lookup.resultTitle}</h2>
        {result.length === 0 ? (
          <p className="text-[14px] text-charcoal/70">{t.lookup.empty}</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {result.map((item) => (
              <li
                key={item.orderCode}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-semibold text-deep-blue">{item.event.title}</p>
                  <p className="text-[13px] text-charcoal/65">
                    {formatDate(item.event.startAt)} · {t.lookup.tickets(item.ticketCount)} ·{" "}
                    {t.orderStatus[item.status]}
                  </p>
                </div>
                <Link
                  href={CHECKOUT_ROUTES.ticket(item.accessToken)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-deep-blue hover:text-emerald-brand"
                >
                  {t.lookup.open}
                  <FiArrowRight aria-hidden="true" size={14} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setPending(null);
          }}
          className="text-[13px] font-medium text-deep-blue hover:text-emerald-brand"
        >
          {t.lookup.again}
        </button>
      </div>
    );
  }

  if (pending) {
    return (
      <form
        onSubmit={handleCode}
        noValidate
        className="space-y-6 rounded-3xl border border-hairline bg-white p-6 md:p-8"
      >
        <div className="flex items-start gap-3 rounded-2xl bg-mint-mist px-4 py-3">
          <FiMail aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-emerald-brand" />
          <p className="text-[13px] leading-relaxed text-deep-blue">
            {t.otp.sentTo} <strong className="break-all">{pending.email}</strong>
          </p>
        </div>
        <div>
          <OtpInput
            value={code}
            onChange={setCode}
            disabled={busy}
            invalid={Boolean(alert)}
            describedBy={hintId}
          />
          <p id={hintId} className="mt-3 text-xs text-charcoal/65">
            {t.otp.validity}
          </p>
        </div>
        <button
          type="button"
          disabled={resendIn > 0 || busy}
          onClick={() => void sendCode({ email: pending.email })}
          className="text-[13px] font-medium text-deep-blue hover:text-emerald-brand disabled:text-charcoal/50"
        >
          {resendIn > 0 ? t.otp.resendIn(resendIn) : t.otp.resend}
        </button>
        <FormAlert tone="error" message={alert} />
        <Button type="submit" disabled={busy} className="w-full disabled:opacity-70">
          {busy ? t.lookup.verifying : t.lookup.verify}
        </Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleEmail}
      noValidate
      className="space-y-5 rounded-3xl border border-hairline bg-white p-6 md:p-8"
    >
      <HoneypotField />
      <p className="text-[14px] leading-relaxed text-charcoal/75">{t.lookup.intro}</p>
      <TextField
        tone="light"
        label={t.lookup.email}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={t.lookup.emailPlaceholder}
        error={emailError}
        disabled={busy}
      />
      <TurnstileWidget siteKey={turnstileSiteKey} />
      <FormAlert tone="error" message={alert} />
      <Button type="submit" disabled={busy} className="w-full disabled:opacity-70">
        {busy ? t.lookup.submitting : t.lookup.submit}
      </Button>
    </form>
  );
}
