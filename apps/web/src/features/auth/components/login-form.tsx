"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, CheckboxField, TextField } from "@lavieco/ui";

import { TurnstileWidget } from "@/shared/components/turnstile-widget";

import { login } from "../actions/login";
import { NEXT_PARAM, ROUTES } from "../constants/config";
import { TEXT } from "../constants/text";
import { loginSchema } from "../schemas";
import { toClientFieldErrors } from "./field-errors";
import { FormAlert } from "./form-alert";
import { GoogleButton } from "./google-button";
import { HoneypotField } from "./honeypot-field";
import { messageFor } from "./messages";

type LoginFormProps = {
  next: string;
  googleEnabled: boolean;
  turnstileSiteKey: string | null;
  urlError: string | null;
};

/** Member sign-in: email + password, or Google. */
export function LoginForm({ next, googleEnabled, turnstileSiteKey, urlError }: LoginFormProps) {
  const t = TEXT.vi.login;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(urlError);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toClientFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setAlert(null);
    setBusy(true);
    const result = await login(values).catch(() => null);
    if (result?.status === "ok") {
      router.replace(next);
      router.refresh();
      return;
    }
    setBusy(false);
    if (!result) setAlert(TEXT.vi.errors.unavailable);
    else if (result.status === "invalid") setErrors(result.fieldErrors);
    else setAlert(messageFor(result));
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <HoneypotField />
        <TextField
          tone="light"
          label={t.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.emailPlaceholder}
          error={errors.email}
          disabled={busy}
        />
        <TextField
          tone="light"
          label={t.password}
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          error={errors.password}
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
        <TurnstileWidget siteKey={turnstileSiteKey} />
        <FormAlert tone="error" message={alert} />
        <Button type="submit" disabled={busy} className="w-full disabled:opacity-70">
          {busy ? t.submitting : t.submit}
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
