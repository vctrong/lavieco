"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { FiMail } from "react-icons/fi";

import { Button, CheckboxField, TextField } from "@lavieco/ui";

import { TurnstileWidget } from "@/shared/components/turnstile-widget";

import { completeReset, requestResetCode } from "../actions/reset-password";
import { ROUTES } from "../constants/config";
import { TEXT } from "../constants/text";
import { useCountdown } from "../hooks/use-countdown";
import { resetRequestSchema } from "../schemas";
import { toClientFieldErrors } from "./field-errors";
import { FormAlert } from "./form-alert";
import { HoneypotField } from "./honeypot-field";
import { messageFor } from "./messages";
import { OtpInput } from "./otp-input";

type Pending = { email: string; challengeId: string; resendAvailableAt: string };

/** Forgotten password: email → code + new password → signed in with the new password. */
export function ResetFlow({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const t = TEXT.vi;
  const router = useRouter();
  const codeHintId = useId();
  const [pending, setPending] = useState<Pending | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const resendIn = useCountdown(pending?.resendAvailableAt ?? null);

  const sendCode = async (input: Record<string, unknown>, email: string) => {
    setBusy(true);
    setAlert(null);
    const result = await requestResetCode(input).catch(() => null);
    setBusy(false);
    if (!result) return setAlert(t.errors.unavailable);
    if (result.status === "invalid") return setErrors(result.fieldErrors);
    if (result.status === "error") return setAlert(messageFor(result));
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
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = resetRequestSchema.safeParse(values);
    if (!parsed.success) return setErrors(toClientFieldErrors(parsed.error));
    setErrors({});
    await sendCode(values, parsed.data.email);
  };

  const handleComplete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !pending) return;
    const newPassword = String(new FormData(event.currentTarget).get("newPassword") ?? "");
    if (!verificationToken && !/^\d{6}$/.test(code)) return setAlert(t.validation.code);
    setBusy(true);
    setAlert(null);
    setErrors({});
    const result = await completeReset({
      email: pending.email,
      challengeId: pending.challengeId,
      code: code || "000000",
      newPassword,
      verificationToken,
    }).catch(() => null);
    if (result?.status === "ok") {
      router.replace(ROUTES.account);
      router.refresh();
      return;
    }
    setBusy(false);
    if (!result) setAlert(t.errors.unavailable);
    else if (result.status === "invalid") setErrors(result.fieldErrors);
    else if (result.reason === "password_weak") {
      setVerificationToken(result.verificationToken);
      setErrors({ newPassword: messageFor(result) });
    } else setAlert(messageFor(result));
  };

  if (!pending) {
    return (
      <form onSubmit={handleRequest} noValidate className="space-y-5">
        <HoneypotField />
        <TextField
          tone="light"
          label={t.reset.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.reset.emailPlaceholder}
          error={errors.email}
          disabled={busy}
        />
        <TurnstileWidget siteKey={turnstileSiteKey} />
        <FormAlert tone="error" message={alert} />
        <Button type="submit" disabled={busy} className="w-full disabled:opacity-70">
          {busy ? t.reset.requesting : t.reset.requestSubmit}
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
    <form onSubmit={handleComplete} noValidate className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl bg-mint-mist px-4 py-3">
        <FiMail aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-emerald-brand" />
        <p className="text-[13px] leading-relaxed text-deep-blue">
          {t.reset.sentNote} <strong className="break-all">{pending.email}</strong>
        </p>
      </div>
      {verificationToken ? null : (
        <div>
          <p className="mb-3 font-display text-xl text-deep-blue">{t.otp.title}</p>
          <OtpInput value={code} onChange={setCode} disabled={busy} describedBy={codeHintId} />
          <p id={codeHintId} className="mt-3 text-xs leading-relaxed text-charcoal/65">
            {t.otp.validity}
          </p>
        </div>
      )}
      <TextField
        tone="light"
        label={t.reset.newPassword}
        name="newPassword"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        hint={t.reset.passwordHint}
        error={errors.newPassword}
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
          onClick={() => sendCode({ email: pending.email }, pending.email)}
          className="font-medium text-deep-blue hover:text-emerald-brand disabled:cursor-default disabled:text-charcoal/50"
        >
          {resendIn > 0 ? t.otp.resendIn(resendIn) : t.otp.resend}
        </button>
      </div>
      <FormAlert tone="error" message={alert} />
      <Button type="submit" disabled={busy} className="w-full disabled:opacity-70">
        {busy ? t.reset.submitting : t.reset.submit}
      </Button>
    </form>
  );
}
