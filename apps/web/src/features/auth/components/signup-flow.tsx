"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { FiEdit2, FiMail } from "react-icons/fi";

import {
  BusyLabel,
  Button,
  CheckboxField,
  FormAlert,
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

import { completeSignup, requestSignupCode } from "../actions/signup";
import { NEXT_PARAM, ROUTES } from "../constants/config";
import { TEXT } from "../constants/text";
import { signupDetailsSchema, type SignupDetailsInput } from "../schemas";
import { formErrorsOf } from "./field-errors";
import { GoogleButton } from "./google-button";
import { failureOf, messageFor } from "./messages";

type SignupFlowProps = {
  next: string;
  googleEnabled: boolean;
  turnstileSiteKey: string | null;
  urlError: string | null;
};

type Pending = { challengeId: string; resendAvailableAt: string };

const FIELD_ORDER = ["displayName", "email", "password", "consent"];
const fieldId = (key: string) => `dang-ky-${key}`;

/**
 * Sign-up in two steps: details (name, email, password, consent) → 6-digit code sent
 * by email → account created and signed in. The password stays in this component's
 * memory between the steps; nothing is stored in the browser.
 */
export function SignupFlow({ next, googleEnabled, turnstileSiteKey, urlError }: SignupFlowProps) {
  const t = TEXT.vi;
  const f = FORM_TEXT.vi;
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
  const [failure, setFailure] = useState<FormFailure | null>(
    urlError ? { message: urlError, reload: false } : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  // A Turnstile token is single use: every send asks the widget for a new one.
  const [turnstileReset, setTurnstileReset] = useState(0);
  // The code step never renders on the server, so the clock is always known here.
  const resendIn = useCountdown(pending?.resendAvailableAt ?? null) ?? 0;
  const form = useFormErrors({ fieldOrder: FIELD_ORDER, fieldId, paused: busy });
  const codeFormRef = useRef<HTMLFormElement>(null);

  const recheck = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (target instanceof HTMLInputElement) form.clearServerError(target.name);
    form.revalidate(formErrorsOf(signupDetailsSchema, event.currentTarget));
  };

  const sendCode = async (input: Record<string, unknown>) => {
    setBusy(true);
    setFailure(null);
    const result = await callAction(() => requestSignupCode(input));
    setTurnstileReset((count) => count + 1);
    setBusy(false);
    if (result.status === "invalid") {
      setStep("details");
      form.showServerErrors(result.fieldErrors);
      return false;
    }
    if (result.status === "error") {
      setFailure(failureOf(result));
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
    setFailure(null);
    if (!form.check(formErrorsOf(signupDetailsSchema, event.currentTarget))) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = signupDetailsSchema.safeParse(values);
    if (!parsed.success) return;
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
    setFailure(null);
    const result = await callAction(() =>
      completeSignup({
        ...input,
        challengeId: current.challengeId,
        code: code || "000000",
        verificationToken: token,
      }),
    );
    if (result.status === "ok") {
      router.replace(next);
      router.refresh();
      return;
    }
    setBusy(false);
    if (result.status === "invalid") {
      setStep("details");
      form.showServerErrors(result.fieldErrors);
    } else if (result.reason === "password_weak") {
      // The code was right: only the password has to change, no new code needed.
      setVerificationToken(result.verificationToken);
      setPending(current);
      setStep("details");
      form.showServerErrors({ password: messageFor(result) });
    } else {
      setFailure(failureOf(result));
    }
  };

  const handleCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !details || !pending) return;
    if (!/^\d{6}$/.test(code)) {
      setFailure({ message: t.validation.code, reload: false });
      return;
    }
    await finish(details, pending, verificationToken);
  };

  const handleResend = async () => {
    if (!details || resendIn > 0 || busy) return;
    setVerificationToken(undefined);
    // A Turnstile token is single use: the code step has its own widget for resends.
    const token = codeFormRef.current
      ? String(new FormData(codeFormRef.current).get("turnstileToken") ?? "") || undefined
      : undefined;
    if (await sendCode({ ...details, turnstileToken: token })) setNotice(t.otp.resent);
  };

  // Step 2: the code.
  if (step === "code" && details && pending) {
    return (
      <form ref={codeFormRef} onSubmit={handleCode} noValidate className="space-y-6">
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
            invalid={Boolean(failure)}
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
              setFailure(null);
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
        {resendIn === 0 ? (
          <TurnstileWidget siteKey={turnstileSiteKey} resetSignal={turnstileReset} />
        ) : null}
        <FormAlert tone="success" message={notice} />
        <FailureAlert failure={failure} />
        <Button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="w-full disabled:opacity-70"
        >
          <BusyLabel busy={busy} idle={t.otp.submitSignup} sending={t.otp.submitting} />
        </Button>
      </form>
    );
  }

  // Step 1: the details.
  return (
    <>
      <form
        onSubmit={handleDetails}
        onChange={recheck}
        onBlur={recheck}
        noValidate
        className="space-y-5"
      >
        <HoneypotField />
        <RequiredNote text={f.requiredNote} />
        <TextField
          tone="light"
          id={fieldId("displayName")}
          label={t.signup.displayName}
          name="displayName"
          autoComplete="name"
          required
          placeholder={t.signup.displayNamePlaceholder}
          defaultValue={details?.displayName}
          error={form.errors.displayName}
          disabled={busy}
        />
        <TextField
          tone="light"
          id={fieldId("email")}
          label={t.signup.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={t.signup.emailPlaceholder}
          defaultValue={details?.email}
          error={form.errors.email}
          disabled={busy}
        />
        <TextField
          tone="light"
          id={fieldId("password")}
          label={t.signup.password}
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          hint={t.signup.passwordHint}
          error={form.errors.password}
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
          id={fieldId("consent")}
          label={t.signup.consent}
          name="consent"
          value="yes"
          required
          defaultChecked={consentTicked}
          onChange={(event) => setConsentTicked(event.target.checked)}
          error={form.errors.consent}
        />
        <TurnstileWidget siteKey={turnstileSiteKey} resetSignal={turnstileReset} />
        <FormErrorNote
          announcement={
            form.invalidFields.length > 0 ? f.announce(form.invalidFields.length) : null
          }
          message={form.invalidFields.length > 0 ? f.aboveSubmit(form.invalidFields.length) : null}
        />
        <FailureAlert failure={failure} />
        <Button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="w-full disabled:opacity-70"
        >
          <BusyLabel busy={busy} idle={t.signup.submit} sending={t.signup.submitting} />
        </Button>
      </form>
      {googleEnabled ? (
        <GoogleButton
          next={next}
          withConsent
          disabled={!consentTicked}
          onBlocked={() => form.showServerErrors({ consent: t.signup.googleNeedsConsent })}
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
