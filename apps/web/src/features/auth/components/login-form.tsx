"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

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
import { TurnstileWidget } from "@/shared/components/turnstile-widget";
import { FORM_TEXT } from "@/shared/constants/form-text";
import { callAction } from "@/shared/call-action";
import type { FormFailure } from "@/shared/form-failures";

import { login } from "../actions/login";
import { NEXT_PARAM, ROUTES } from "../constants/config";
import { TEXT } from "../constants/text";
import { loginSchema } from "../schemas";
import { formErrorsOf } from "./field-errors";
import { GoogleButton } from "./google-button";
import { failureOf } from "./messages";

type LoginFormProps = {
  next: string;
  googleEnabled: boolean;
  turnstileSiteKey: string | null;
  urlError: string | null;
};

const FIELD_ORDER = ["email", "password"];
const fieldId = (key: string) => `dang-nhap-${key}`;

/** Member sign-in: email + password, or Google. */
export function LoginForm({ next, googleEnabled, turnstileSiteKey, urlError }: LoginFormProps) {
  const t = TEXT.vi.login;
  const f = FORM_TEXT.vi;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failure, setFailure] = useState<FormFailure | null>(
    urlError ? { message: urlError, reload: false } : null,
  );
  // A Turnstile token is single use: every submit asks the widget for a new one.
  const [turnstileReset, setTurnstileReset] = useState(0);
  const form = useFormErrors({ fieldOrder: FIELD_ORDER, fieldId, paused: busy });

  const recheck = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (target instanceof HTMLInputElement) form.clearServerError(target.name);
    form.revalidate(formErrorsOf(loginSchema, event.currentTarget));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setFailure(null);
    if (!form.check(formErrorsOf(loginSchema, event.currentTarget))) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    const result = await callAction(() => login(values));
    setTurnstileReset((count) => count + 1);
    if (result.status === "ok") {
      router.replace(next);
      router.refresh();
      return;
    }
    setBusy(false);
    if (result.status === "invalid") form.showServerErrors(result.fieldErrors);
    else setFailure(failureOf(result));
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        onChange={recheck}
        onBlur={recheck}
        noValidate
        className="space-y-5"
      >
        <HoneypotField />
        <RequiredNote text={f.requiredNote} />
        <TextField
          tone="light"
          id={fieldId("email")}
          label={t.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={t.emailPlaceholder}
          error={form.errors.email}
          disabled={busy}
        />
        <TextField
          tone="light"
          id={fieldId("password")}
          label={t.password}
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          error={form.errors.password}
          disabled={busy}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CheckboxField
            tone="light"
            label={t.showPassword}
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          <Link
            href={ROUTES.reset}
            className="text-[13px] font-medium text-deep-blue underline-offset-4 hover:text-emerald-brand hover:underline"
          >
            {t.forgot}
          </Link>
        </div>
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
          <BusyLabel busy={busy} idle={t.submit} sending={t.submitting} />
        </Button>
      </form>
      {googleEnabled ? <GoogleButton next={next} /> : null}
      <p className="mt-6 text-center text-[13px] text-charcoal/70">
        {t.noAccount}{" "}
        <Link
          href={`${ROUTES.signup}?${NEXT_PARAM}=${encodeURIComponent(next)}`}
          className="font-semibold text-deep-blue underline-offset-4 hover:text-emerald-brand hover:underline"
        >
          {t.toSignup}
        </Link>
      </p>
    </>
  );
}
