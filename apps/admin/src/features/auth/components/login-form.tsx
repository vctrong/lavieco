"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, TextField } from "@lavieco/ui";

import { staffLogin } from "../actions/staff-login";
import { TEXT } from "../constants/text";
import { staffLoginSchema } from "../schemas";
import { FormError } from "./form-error";
import { fieldErrorsOf } from "./field-errors";

/** Staff login, step 1 of 2. */
export function LoginForm({ next }: { next: string }) {
  const t = TEXT.vi;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = staffLoginSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    setErrors({});
    setAlert(null);
    setBusy(true);
    const result = await staffLogin(values).catch(() => null);
    if (result?.status === "ok") {
      router.push(`/2fa?next=${encodeURIComponent(next)}`);
      return;
    }
    setBusy(false);
    if (!result) setAlert(t.errors.unavailable);
    else if (result.status === "invalid") setErrors(result.fieldErrors);
    else setAlert(t.errors[result.reason]);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <TextField
        tone="light"
        label={t.login.email}
        name="email"
        type="email"
        autoComplete="username"
        error={errors.email}
        disabled={busy}
      />
      <TextField
        tone="light"
        label={t.login.password}
        name="password"
        type="password"
        autoComplete="current-password"
        error={errors.password}
        disabled={busy}
      />
      <FormError message={alert} />
      <Button type="submit" disabled={busy} className="w-full disabled:opacity-70">
        {busy ? t.login.submitting : t.login.submit}
      </Button>
    </form>
  );
}
