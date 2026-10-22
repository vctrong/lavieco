"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { FiMail } from "react-icons/fi";

import {
  BusyLabel,
  Button,
  CheckboxField,
  FormErrorNote,
  RequiredNote,
  TextField,
  useFormErrors,
} from "@lavieco/ui";

import { FailureAlert } from "@/shared/components/failure-alert";
import { HoneypotField } from "@/shared/components/honeypot-field";
import { OtpInput } from "@/shared/components/otp-input";
import { TurnstileWidget } from "@/shared/components/turnstile-widget";
import { FORM_TEXT } from "@/shared/constants/form-text";
import { callAction } from "@/shared/call-action";
import type { FormFailure } from "@/shared/form-failures";
import { useCountdown } from "@/shared/hooks/use-countdown";

import { completeReset, requestResetCode } from "../actions/reset-password";
import { ROUTES } from "../constants/config";
import { TEXT } from "../constants/text";
import { resetCompleteSchema, resetRequestSchema } from "../schemas";
import { formErrorsOf } from "./field-errors";
import { failureOf, messageFor } from "./messages";

type Pending = { email: string; challengeId: string; resendAvailableAt: string };

const REQUEST_FIELDS = ["email"];
const COMPLETE_FIELDS = ["newPassword"];
const fieldId = (key: string) => `dat-lai-${key}`;
/** Step 2 checks only the new password here; the code has its own message. */
const newPasswordSchema = resetCompleteSchema.pick({ newPassword: true });

/** Forgotten password: email → code + new password → signed in with the new password. */
export function ResetFlow({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const t = TEXT.vi;
  const f = FORM_TEXT.vi;
  const router = useRouter();
  const codeHintId = useId();
  const [pending, setPending] = useState<Pending | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failure, setFailure] = useState<FormFailure | null>(null);
  // A Turnstile token is single use: every send asks the widget for a new one.
  const [turnstileReset, setTurnstileReset] = useState(0);
  // The code step never renders on the server, so the clock is always known here.
  const resendIn = useCountdown(pending?.resendAvailableAt ?? null) ?? 0;
  const requestForm = useFormErrors({ fieldOrder: REQUEST_FIELDS, fieldId, paused: busy });
  const completeForm = useFormErrors({ fieldOrder: COMPLETE_FIELDS, fieldId, paused: busy });
  const completeRef = useRef<HTMLFormElement>(null);

  const sendCode = async (input: Record<string, unknown>, email: string) => {
    setBusy(true);
    setFailure(null);
    const result = await callAction(() => requestResetCode(input));
    setTurnstileReset((count) => count + 1);
    setBusy(false);
    if (result.status === "invalid") return requestForm.showServerErrors(result.fieldErrors);
    if (result.status === "error") return setFailure(failureOf(result));
    setVerificationToken(undefined);
    setCode("");
    setPending({
      email,
      challengeId: result.challengeId,
      resendAvailableAt: result.resendAvailableAt,
    });
  };

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setFailure(null);
    if (!requestForm.check(formErrorsOf(resetRequestSchema, event.currentTarget))) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await sendCode(values, String(values.email ?? "").trim());
  };

  const handleResend = async () => {
    if (!pending || resendIn > 0 || busy) return;
    // A Turnstile token is single use: this step has its own widget for resends.
    const token = completeRef.current
      ? String(new FormData(completeRef.current).get("turnstileToken") ?? "") || undefined
      : undefined;
    await sendCode({ email: pending.email, turnstileToken: token }, pending.email);
  };

  const handleComplete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !pending) return;
    setFailure(null);
    if (!completeForm.check(formErrorsOf(newPasswordSchema, event.currentTarget))) return;
    const newPassword = String(new FormData(event.currentTarget).get("newPassword") ?? "");
    if (!verificationToken && !/^\d{6}$/.test(code)) {
      return setFailure({ message: t.validation.code, reload: false });
    }
    setBusy(true);
    const result = await callAction(() =>
      completeReset({
        email: pending.email,
        challengeId: pending.challengeId,
        code: code || "000000",
        newPassword,
        verificationToken,
      }),
    );
    if (result.status === "ok") {
      router.replace(ROUTES.account);
      router.refresh();
      return;
    }
    setBusy(false);
    if (result.status === "invalid") completeForm.showServerErrors(result.fieldErrors);
    else if (result.reason === "password_weak") {
      setVerificationToken(result.verificationToken);
      completeForm.showServerErrors({ newPassword: messageFor(result) });
    } else setFailure(failureOf(result));
  };

  if (!pending) {
    return (
      <form
        onSubmit={handleRequest}
        onChange={(event) => {
          requestForm.clearServerError("email");
          requestForm.revalidate(formErrorsOf(resetRequestSchema, event.currentTarget));
        }}
        onBlur={(event) =>
          requestForm.revalidate(formErrorsOf(resetRequestSchema, event.currentTarget))
        }
        noValidate
        className="space-y-5"
      >
        <HoneypotField />
        <RequiredNote text={f.requiredNote} />
        <TextField
          tone="light"
          id={fieldId("email")}
          label={t.reset.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={t.reset.emailPlaceholder}
          error={requestForm.errors.email}
          disabled={busy}
        />
        <TurnstileWidget siteKey={turnstileSiteKey} resetSignal={turnstileReset} />
        <FormErrorNote
          announcement={
            requestForm.invalidFields.length > 0
              ? f.announce(requestForm.invalidFields.length)
              : null
          }
          message={
            requestForm.invalidFields.length > 0
              ? f.aboveSubmit(requestForm.invalidFields.length)
              : null
          }
        />
        <FailureAlert failure={failure} />
        <Button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="w-full disabled:opacity-70"
        >
          <BusyLabel busy={busy} idle={t.reset.requestSubmit} sending={t.reset.requesting} />
        </Button>
        <p className="text-center text-[13px]">
          <Link
            href={ROUTES.login}
            className="font-medium text-deep-blue underline-offset-4 hover:text-emerald-brand hover:underline"
          >
            {t.reset.backToLogin}
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form
      ref={completeRef}
      onSubmit={handleComplete}
      onChange={(event) => {
        completeForm.clearServerError("newPassword");
        completeForm.revalidate(formErrorsOf(newPasswordSchema, event.currentTarget));
      }}
      onBlur={(event) =>
        completeForm.revalidate(formErrorsOf(newPasswordSchema, event.currentTarget))
      }
      noValidate
      className="space-y-6"
    >
      <div className="flex items-start gap-3 rounded-2xl bg-mint-mist px-4 py-3">
        <FiMail aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-emerald-brand" />
        <p className="text-[13px] leading-relaxed text-deep-blue">
          {t.reset.sentNote} <strong className="break-all">{pending.email}</strong>
        </p>
      </div>
      <RequiredNote text={f.requiredNote} />
      {verificationToken ? null : (
        <div>
          <p className="mb-3 font-display text-xl text-deep-blue">
            {t.otp.title}
            <span aria-hidden="true" className="ml-0.5 text-error">
              *
            </span>
          </p>
          <OtpInput value={code} onChange={setCode} disabled={busy} describedBy={codeHintId} />
          <p id={codeHintId} className="mt-3 text-xs leading-relaxed text-charcoal/65">
            {t.otp.validity}
          </p>
        </div>
      )}
      <TextField
        tone="light"
        id={fieldId("newPassword")}
        label={t.reset.newPassword}
        name="newPassword"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        required
        hint={t.reset.passwordHint}
        error={completeForm.errors.newPassword}
        disabled={busy}
      />
      <CheckboxField
        tone="light"
        label={t.reset.showPassword}
        checked={showPassword}
        onChange={(event) => setShowPassword(event.target.checked)}
      />
      <div className="flex justify-end text-[13px]">
        <button
          type="button"
          disabled={resendIn > 0 || busy}
          onClick={handleResend}
          className="font-medium text-deep-blue hover:text-emerald-brand disabled:cursor-default disabled:text-charcoal/50"
        >
          {resendIn > 0 ? t.otp.resendIn(resendIn) : t.otp.resend}
        </button>
      </div>
      {resendIn === 0 ? (
        <TurnstileWidget siteKey={turnstileSiteKey} resetSignal={turnstileReset} />
      ) : null}
      <FormErrorNote
        announcement={
          completeForm.invalidFields.length > 0
            ? f.announce(completeForm.invalidFields.length)
            : null
        }
        message={
          completeForm.invalidFields.length > 0
            ? f.aboveSubmit(completeForm.invalidFields.length)
            : null
        }
      />
      <FailureAlert failure={failure} />
      <Button type="submit" disabled={busy} aria-busy={busy} className="w-full disabled:opacity-70">
        <BusyLabel busy={busy} idle={t.reset.submit} sending={t.reset.submitting} />
      </Button>
    </form>
  );
}
