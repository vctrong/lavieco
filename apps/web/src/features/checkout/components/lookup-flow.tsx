"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { FiMail } from "react-icons/fi";

import {
  orderDisplayStatus,
  type OrderDisplayStatus,
  type TicketLookupResponse,
} from "@lavieco/shared/events";
import { Button, TextField } from "@lavieco/ui";

import { FailureAlert } from "@/shared/components/failure-alert";
import { HoneypotField } from "@/shared/components/honeypot-field";
import { OtpInput } from "@/shared/components/otp-input";
import { TurnstileWidget } from "@/shared/components/turnstile-widget";
import { callAction } from "@/shared/call-action";
import type { FormFailure } from "@/shared/form-failures";
import { useCountdown } from "@/shared/hooks/use-countdown";

import { requestLookupCode, verifyLookup } from "../actions/lookup";
import { CHECKOUT_ROUTES } from "../constants/config";
import { TEXT } from "../constants/text";
import { formatDate } from "../utils/format";
import { failureOf } from "./messages";
import { TicketStub, type ChipTone } from "./ticket-card";

const ORDER_TONES: Record<OrderDisplayStatus, ChipTone> = {
  paid: "valid",
  confirmed: "valid",
  pending: "attention",
  refunded: "attention",
  expired: "muted",
  cancelled: "muted",
};

type Pending = { email: string; challengeId: string; resendAvailableAt: string };

/** `/tra-cuu-ve`: email → 6-digit code → every paid order of that email (docs/05 §5.4). */
export function LookupFlow({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const t = TEXT.vi;
  const hintId = useId();
  const [pending, setPending] = useState<Pending | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [alert, setAlert] = useState<FormFailure | null>(null);
  // A Turnstile token is single use: every send asks the widget for a new one.
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [result, setResult] = useState<TicketLookupResponse["items"] | null>(null);
  // The code step never renders on the server, so the clock is always known here.
  const resendIn = useCountdown(pending?.resendAvailableAt ?? null) ?? 0;
  const codeFormRef = useRef<HTMLFormElement>(null);

  const sendCode = async (values: Record<string, unknown>) => {
    setBusy(true);
    setAlert(null);
    const sent = await callAction(() => requestLookupCode(values));
    setTurnstileReset((count) => count + 1);
    setBusy(false);
    if (sent.status === "invalid") return setEmailError(sent.fieldErrors.email);
    if (sent.status === "error") return setAlert(failureOf(sent));
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
    if (!/^\d{6}$/.test(code)) return setAlert({ message: t.errors.codeFormat, reload: false });
    setBusy(true);
    setAlert(null);
    const found = await callAction(() => verifyLookup({ challengeId: pending.challengeId, code }));
    setBusy(false);
    if (found.status === "invalid")
      return setAlert({ message: t.errors.codeFormat, reload: false });
    if (found.status === "error") return setAlert(failureOf(found));
    setResult(found.items);
  };

  if (result) {
    return (
      <div className="space-y-5 rounded-3xl border border-hairline bg-white p-6 md:p-8">
        <h2 className="font-display text-2xl text-deep-blue">{t.lookup.resultTitle}</h2>
        {result.length === 0 ? (
          <p className="text-[14px] text-charcoal/70">{t.lookup.empty}</p>
        ) : (
          <ul className="space-y-4">
            {result.map((item) => {
              const status = orderDisplayStatus(item);
              return (
                <li key={item.orderCode}>
                  <TicketStub
                    href={CHECKOUT_ROUTES.ticket(item.accessToken)}
                    title={item.event.title}
                    date={formatDate(item.event.startAt)}
                    status={{ label: t.orderStatus[status], tone: ORDER_TONES[status] }}
                    ticketCount={t.lookup.tickets(item.ticketCount)}
                    orderCode={t.lookup.orderCode(item.orderCode)}
                    openLabel={t.lookup.open}
                  />
                </li>
              );
            })}
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
        ref={codeFormRef}
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
          onClick={() =>
            // A Turnstile token is single use: the code step has its own widget for resends.
            void sendCode({
              email: pending.email,
              ...(codeFormRef.current ? Object.fromEntries(new FormData(codeFormRef.current)) : {}),
            })
          }
          className="text-[13px] font-medium text-deep-blue hover:text-emerald-brand disabled:text-charcoal/50"
        >
          {resendIn > 0 ? t.otp.resendIn(resendIn) : t.otp.resend}
        </button>
        {resendIn === 0 ? (
          <TurnstileWidget siteKey={turnstileSiteKey} resetSignal={turnstileReset} />
        ) : null}
        <FailureAlert failure={alert} />
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
      <TurnstileWidget siteKey={turnstileSiteKey} resetSignal={turnstileReset} />
      <FailureAlert failure={alert} />
      <Button type="submit" disabled={busy} className="w-full disabled:opacity-70">
        {busy ? t.lookup.submitting : t.lookup.submit}
      </Button>
    </form>
  );
}
