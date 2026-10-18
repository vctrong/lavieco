"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { FiEdit2, FiMail } from "react-icons/fi";

import { Button, CheckboxField, TextField } from "@lavieco/ui";

import { TurnstileWidget } from "@/shared/components/turnstile-widget";

import { FormAlert } from "@/shared/components/form-alert";
import { HoneypotField } from "@/shared/components/honeypot-field";
import { OtpInput } from "@/shared/components/otp-input";
import { useCountdown } from "@/shared/hooks/use-countdown";

import { completeSignup, requestSignupCode } from "../actions/signup";
import { NEXT_PARAM, ROUTES } from "../constants/config";
import { TEXT } from "../constants/text";
import { signupDetailsSchema, type SignupDetailsInput } from "../schemas";
import { toClientFieldErrors } from "./field-errors";
import { GoogleButton } from "./google-button";
import { messageFor } from "./messages";

type SignupFlowProps = {
  next: string;
  googleEnabled: boolean;
  turnstileSiteKey: string | null;
  urlError: string | null;
};

type Pending = { challengeId: string; resendAvailableAt: string };

/**
 * Sign-up in two steps: details (name, email, password, consent) → 6-digit code sent
 * by email → account created and signed in. The password stays in this component's
 * memory between the steps; nothing is stored in the browser.
 */
export function SignupFlow({ next, googleEnabled, turnstileSiteKey, urlError }: SignupFlowProps) {
  const t = TEXT.vi;
  const router = useRouter();
  const codeHintId = useId();
  const [step, setStep] = useState<"details" | "code">("details");
  const [details, setDetails] = useState<SignupDetailsInput | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [consentTicked, setConsentTicked] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(urlError);
  const [notice, setNotice] = useState<string | null>(null);
  // The code step never renders on the server, so the clock is always known here.
  const resendIn = useCountdown(pending?.resendAvailableAt ?? null) ?? 0;

  const sendCode = async (input: Record<string, unknown>) => {
    setBusy(true);
    setAlert(null);
    const result = await requestSignupCode(input).catch(() => null);
    setBusy(false);
    if (!result) {
      setAlert(t.errors.unavailable);
      return false;
    }
    if (result.status === "invalid") {
      setErrors(result.fieldErrors);
      return false;
    }
    if (result.status === "error") {
      setAlert(messageFor(result));
      return false;
    }
    setPending({ challengeId: result.challengeId, resendAvailableAt: result.resendAvailableAt });
    setCode("");
    setStep("code");
    return true;
  };

  const handleDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = signupDetailsSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toClientFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    // A proof kept after a refused password only belongs to the same email.
    if (details && details.email !== parsed.data.email) setVerificationToken(undefined);
    setDetails(parsed.data);
    if (verificationToken && pending && details?.email === parsed.data.email) {
      await finish(parsed.data, pending, verificationToken);
      return;
    }
    await sendCode(values);
  };

  const finish = async (input: SignupDetailsInput, current: Pending, token?: string) => {
    setBusy(true);
    setAlert(null);
    const result = await completeSignup({
      ...input,
      challengeId: current.challengeId,
      code: code || "000000",
      verificationToken: token,
    }).catch(() => null);
    if (result?.status === "ok") {
      router.replace(next);
      router.refresh();
      return;
    }
    setBusy(false);
    if (!result) {
      setAlert(t.errors.unavailable);
    } else if (result.status === "invalid") {
      setErrors(result.fieldErrors);
    } else if (result.reason === "password_weak") {
      // The code was right: only the password has to change, no new code needed.
      setVerificationToken(result.verificationToken);
      setPending(current);
      setStep("details");
      setErrors({ password: messageFor(result) });
    } else {
      setAlert(messageFor(result));
    }
  };

  const handleCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !details || !pending) return;
    if (!/^\d{6}$/.test(code)) {
      setAlert(t.validation.code);
      return;
    }
    await finish(details, pending, verificationToken);
  };

  const handleResend = async () => {
    if (!details || resendIn > 0 || busy) return;
    setVerificationToken(undefined);
    if (await sendCode({ ...details })) setNotice(t.otp.resent);
  };

  // Step 2: the code.
  if (step === "code" && details && pending) {
    return (
      <form onSubmit={handleCode} noValidate className="space-y-6">
        <div className="flex items-start gap-3 rounded-2xl bg-mint-mist px-4 py-3">
          <FiMail aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-emerald-brand" />
          <p className="text-[13px] leading-relaxed text-deep-blue">
            {t.otp.sentTo} <strong className="break-all">{details.email}</strong>
          </p>
        </div>
        <div>
          <p className="mb-3 font-display text-xl text-deep-blue">{t.otp.title}</p>
          <OtpInput
            value={code}
            onChange={setCode}
            disabled={busy}
            invalid={Boolean(alert)}
            describedBy={codeHintId}
          />
          <p id={codeHintId} className="mt-3 text-xs leading-relaxed text-charcoal/65">
            {t.otp.validity}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setPending(null);
              setVerificationToken(undefined);
              setAlert(null);
              setNotice(null);
            }}
            className="inline-flex items-center gap-1.5 font-medium text-deep-blue hover:text-emerald-brand"
          >
            <FiEdit2 aria-hidden="true" size={14} />
            {t.otp.changeEmail}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendIn > 0 || busy}
            className="font-medium text-deep-blue hover:text-emerald-brand disabled:cursor-default disabled:text-charcoal/50"
          >
            {resendIn > 0 ? t.otp.resendIn(resendIn) : t.otp.resend}
          </button>
        </div>
        <FormAlert tone="success" message={notice} />
        <FormAlert tone="error" message={alert} />
        <Button type="submit" disabled={busy} className="w-full disabled:opacity-70">
          {busy ? t.otp.submitting : t.otp.submitSignup}
        </Button>
      </form>
    );
  }

  // Step 1: the details.
  return (
    <>
      <form onSubmit={handleDetails} noValidate className="space-y-5">
        <HoneypotField />
        <TextField
          tone="light"
          label={t.signup.displayName}
          name="displayName"
          autoComplete="name"
          placeholder={t.signup.displayNamePlaceholder}
          defaultValue={details?.displayName}
          error={errors.displayName}
          disabled={busy}
        />
        <TextField
          tone="light"
          label={t.signup.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.signup.emailPlaceholder}
          defaultValue={details?.email}
          error={errors.email}
          disabled={busy}
        />
        <TextField
          tone="light"
          label={t.signup.password}
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          hint={t.signup.passwordHint}
          error={errors.password}
          disabled={busy}
        />
        <CheckboxField
          tone="light"
          label={t.signup.showPassword}
          checked={showPassword}
          onChange={(event) => setShowPassword(event.target.checked)}
        />
        <CheckboxField
          tone="light"
          label={t.signup.consent}
          name="consent"
          value="yes"
          defaultChecked={consentTicked}
          onChange={(event) => setConsentTicked(event.target.checked)}
          error={errors.consent}
        />
        <TurnstileWidget siteKey={turnstileSiteKey} />
        <FormAlert tone="error" message={alert} />
        <Button type="submit" disabled={busy} className="w-full disabled:opacity-70">
          {busy ? t.signup.submitting : t.signup.submit}
        </Button>
      </form>
      {googleEnabled ? (
        <GoogleButton
          next={next}
          withConsent
          disabled={!consentTicked}
          onBlocked={() =>
            setErrors((current) => ({ ...current, consent: t.signup.googleNeedsConsent }))
          }
        />
      ) : null}
      <p className="mt-6 text-center text-[13px] text-charcoal/70">
        {t.signup.haveAccount}{" "}
        <Link
          href={`${ROUTES.login}?${NEXT_PARAM}=${encodeURIComponent(next)}`}
          className="font-semibold text-deep-blue underline-offset-4 hover:text-emerald-brand hover:underline"
        >
          {t.signup.toLogin}
        </Link>
      </p>
    </>
  );
}
