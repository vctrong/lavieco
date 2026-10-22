"use client";

import Link from "next/link";
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

import { staffVerifySecondFactor } from "../actions/staff-login";
import { TEXT } from "../constants/text";
import { secondFactorSchema } from "../schemas";
import { failureOf, formErrorsOf } from "./messages";

const FIELD_ORDER = ["code"];
const fieldId = (key: string) => `2fa-${key}`;

/** Staff login, step 2 of 2: TOTP code or one recovery code. */
export function SecondFactorForm({ next }: { next: string }) {
  const t = TEXT.vi;
  const f = FORM_TEXT.vi;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<FormFailure | null>(null);
  const [expired, setExpired] = useState(false);
  const form = useFormErrors({ fieldOrder: FIELD_ORDER, fieldId, paused: busy });

  const recheck = (event: FormEvent<HTMLFormElement>) => {
    form.clearServerError("code");
    form.revalidate(formErrorsOf(secondFactorSchema, event.currentTarget));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setFailure(null);
    if (!form.check(formErrorsOf(secondFactorSchema, event.currentTarget))) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    const result = await callAction(() => staffVerifySecondFactor(values));
    if (result.status === "ok") {
      router.replace(next);
      router.refresh();
      return;
    }
    setBusy(false);
    if (result.status === "invalid") form.showServerErrors(result.fieldErrors);
    else {
      setExpired(result.reason === "mfa_expired");
      setFailure(failureOf(result));
    }
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
        id={fieldId("code")}
        label={t.secondFactor.code}
        name="code"
        inputMode="text"
        autoComplete="one-time-code"
        autoFocus
        required
        error={form.errors.code}
        disabled={busy}
        className="text-center font-display text-lg tracking-[0.3em]"
      />
      <FormErrorNote
        announcement={form.invalidFields.length > 0 ? f.announce(form.invalidFields.length) : null}
        message={form.invalidFields.length > 0 ? f.aboveSubmit(form.invalidFields.length) : null}
      />
      <FailureAlert failure={failure} />
      <Button
        type="submit"
        disabled={busy || expired}
        aria-busy={busy}
        className="w-full disabled:opacity-70"
      >
        <BusyLabel busy={busy} idle={t.secondFactor.submit} sending={t.secondFactor.submitting} />
      </Button>
      <p className="text-center text-[13px]">
        <Link href="/login" className="font-medium text-deep-blue hover:text-emerald-brand">
          {t.secondFactor.restart}
        </Link>
      </p>
    </form>
  );
}
