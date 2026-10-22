"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FiShield } from "react-icons/fi";

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

import { acceptInvitation } from "../actions/accept-invitation";
import { TEXT } from "../constants/text";
import { acceptInviteSchema } from "../schemas";
import type { InvitationView } from "../server/inspect-invitation";
import { failureOf, formErrorsOf } from "./messages";

const FIELD_ORDER = ["displayName", "password", "totpCode"];
const fieldId = (key: string) => `kich-hoat-${key}`;

/**
 * Account activation: scan the TOTP seed, set name + password, confirm with the first
 * code. The recovery codes are shown once, then the person goes to the login page.
 */
export function AcceptInviteForm({
  token,
  invitation,
}: {
  token: string;
  invitation: InvitationView;
}) {
  const t = TEXT.vi;
  const f = FORM_TEXT.vi;
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<FormFailure | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const form = useFormErrors({ fieldOrder: FIELD_ORDER, fieldId, paused: busy });
  const errors = form.errors;

  const recheck = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (target instanceof HTMLInputElement) form.clearServerError(target.name);
    form.revalidate(formErrorsOf(acceptInviteSchema, event.currentTarget, { token }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setFailure(null);
    if (!form.check(formErrorsOf(acceptInviteSchema, event.currentTarget, { token }))) return;
    const values = { ...Object.fromEntries(new FormData(event.currentTarget)), token };
    setBusy(true);
    const result = await callAction(() => acceptInvitation(values));
    setBusy(false);
    if (result.status === "invalid") form.showServerErrors(result.fieldErrors);
    else if (result.status === "error") setFailure(failureOf(result));
    else setRecoveryCodes(result.recoveryCodes);
  };

  if (recoveryCodes) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-2xl bg-mint-mist px-4 py-4">
          <FiShield aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-emerald-brand" />
          <div>
            <p className="font-display text-lg text-deep-blue">{t.invite.recoveryTitle}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-charcoal/75">
              {t.invite.recoveryBody}
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-2 rounded-2xl border border-hairline bg-soft-white p-4 font-mono text-sm text-deep-blue">
          {recoveryCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <Button as={Link} href="/login" className="w-full">
          {t.invite.continue}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onChange={recheck}
      onBlur={recheck}
      noValidate
      className="space-y-8"
    >
      <RequiredNote text={f.requiredNote} />
      <section className="space-y-4">
        <p className="text-sm font-semibold text-deep-blue">{t.invite.step1}</p>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-hairline bg-soft-white p-5 sm:flex-row sm:items-start">
          {/* A data URL generated per request: nothing for the image optimizer to do. */}
          <Image
            unoptimized
            src={invitation.qrDataUrl}
            alt={t.invite.qrAlt}
            width={180}
            height={180}
            className="rounded-xl bg-white p-2"
          />
          <div className="min-w-0 text-[13px] leading-relaxed text-charcoal/75">
            <p className="mb-2">{t.invite.manualKey}</p>
            <code className="block break-all rounded-lg bg-white px-3 py-2 font-mono text-[13px] text-deep-blue">
              {invitation.secret}
            </code>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <p className="text-sm font-semibold text-deep-blue">{t.invite.step2}</p>
        <TextField tone="light" label={t.invite.email} value={invitation.email} readOnly disabled />
        <TextField
          tone="light"
          id={fieldId("displayName")}
          label={t.invite.displayName}
          required
          name="displayName"
          autoComplete="name"
          defaultValue={invitation.displayName}
          error={errors.displayName}
          disabled={busy}
        />
        <TextField
          tone="light"
          id={fieldId("password")}
          label={t.invite.password}
          required
          name="password"
          type="password"
          autoComplete="new-password"
          hint={t.invite.passwordHint}
          error={errors.password}
          disabled={busy}
        />
        <TextField
          tone="light"
          id={fieldId("totpCode")}
          label={t.invite.totpCode}
          required
          name="totpCode"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          error={errors.totpCode}
          disabled={busy}
          className="font-display tracking-[0.3em]"
        />
      </section>

      <FormErrorNote
        announcement={form.invalidFields.length > 0 ? f.announce(form.invalidFields.length) : null}
        message={form.invalidFields.length > 0 ? f.aboveSubmit(form.invalidFields.length) : null}
      />
      <FailureAlert failure={failure} />
      <Button type="submit" disabled={busy} aria-busy={busy} className="w-full disabled:opacity-70">
        <BusyLabel busy={busy} idle={t.invite.submit} sending={t.invite.submitting} />
      </Button>
    </form>
  );
}
