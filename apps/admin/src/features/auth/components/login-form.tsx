"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  BusyLabel,
  Button,
  FormErrorNote,
  RequiredNote,
  TextField,
  useFormErrors,
} from "@lavieco/ui";

import { FailureAlert } from "@/shared/components/failure-alert";
import { FORM_TEXT } from "@/shared/constants/form-text";
import { callAction } from "@/shared/call-action";
import type { FormFailure } from "@/shared/form-failures";

import { staffLogin } from "../actions/staff-login";
import { TEXT } from "../constants/text";
import { staffLoginSchema } from "../schemas";
import { failureOf, formErrorsOf } from "./messages";

const FIELD_ORDER = ["email", "password"];
const fieldId = (key: string) => `login-${key}`;

/** Staff login, step 1 of 2. */
export function LoginForm({ next }: { next: string }) {
  const t = TEXT.vi;
  const f = FORM_TEXT.vi;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<FormFailure | null>(null);
  const form = useFormErrors({ fieldOrder: FIELD_ORDER, fieldId, paused: busy });

  const recheck = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (target instanceof HTMLInputElement) form.clearServerError(target.name);
    form.revalidate(formErrorsOf(staffLoginSchema, event.currentTarget));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setFailure(null);
    if (!form.check(formErrorsOf(staffLoginSchema, event.currentTarget))) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    const result = await callAction(() => staffLogin(values));
    if (result.status === "ok") {
      router.push(`/2fa?next=${encodeURIComponent(next)}`);
      return;
    }
    setBusy(false);
    if (result.status === "invalid") form.showServerErrors(result.fieldErrors);
    else setFailure(failureOf(result));
  };

  return (
    <form
      onSubmit={handleSubmit}
      onChange={recheck}
      onBlur={recheck}
      noValidate
      className="space-y-5"
    >
      <RequiredNote text={f.requiredNote} />
      <TextField
        tone="light"
        id={fieldId("email")}
        label={t.login.email}
        name="email"
        type="email"
        autoComplete="username"
        required
        error={form.errors.email}
        disabled={busy}
      />
      <TextField
        tone="light"
        id={fieldId("password")}
        label={t.login.password}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={form.errors.password}
        disabled={busy}
      />
      <FormErrorNote
        announcement={form.invalidFields.length > 0 ? f.announce(form.invalidFields.length) : null}
        message={form.invalidFields.length > 0 ? f.aboveSubmit(form.invalidFields.length) : null}
      />
      <FailureAlert failure={failure} />
      <Button type="submit" disabled={busy} aria-busy={busy} className="w-full disabled:opacity-70">
        <BusyLabel busy={busy} idle={t.login.submit} sending={t.login.submitting} />
      </Button>
    </form>
  );
}
