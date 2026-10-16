"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, TextField } from "@lavieco/ui";

import { staffVerifySecondFactor } from "../actions/staff-login";
import { TEXT } from "../constants/text";
import { secondFactorSchema } from "../schemas";
import { fieldErrorsOf } from "./field-errors";
import { FormError } from "./form-error";

/** Staff login, step 2 of 2: TOTP code or one recovery code. */
export function SecondFactorForm({ next }: { next: string }) {
  const t = TEXT.vi;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = secondFactorSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    setErrors({});
    setAlert(null);
    setBusy(true);
    const result = await staffVerifySecondFactor(values).catch(() => null);
    if (result?.status === "ok") {
      router.replace(next);
      router.refresh();
      return;
    }
    setBusy(false);
    if (!result) setAlert(t.errors.unavailable);
    else if (result.status === "invalid") setErrors(result.fieldErrors);
    else {
      setExpired(result.reason === "mfa_expired");
      setAlert(t.errors[result.reason]);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <TextField
        tone="light"
        label={t.secondFactor.code}
        name="code"
        inputMode="text"
        autoComplete="one-time-code"
        autoFocus
        error={errors.code}
        disabled={busy}
        className="text-center font-display text-lg tracking-[0.3em]"
      />
      <FormError message={alert} />
      <Button type="submit" disabled={busy || expired} className="w-full disabled:opacity-70">
        {busy ? t.secondFactor.submitting : t.secondFactor.submit}
      </Button>
      <p className="text-center text-[13px]">
        <Link href="/login" className="font-medium text-deep-blue hover:text-emerald-brand">
          {t.secondFactor.restart}
        </Link>
      </p>
    </form>
  );
}
