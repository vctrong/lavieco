"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FiShield } from "react-icons/fi";

import { Button, TextField } from "@lavieco/ui";

import { acceptInvitation } from "../actions/accept-invitation";
import { TEXT } from "../constants/text";
import { acceptInviteSchema } from "../schemas";
import type { InvitationView } from "../server/inspect-invitation";
import { fieldErrorsOf } from "./field-errors";
import { FormError } from "./form-error";

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
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const values = { ...Object.fromEntries(new FormData(event.currentTarget)), token };
    const parsed = acceptInviteSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    setErrors({});
    setAlert(null);
    setBusy(true);
    const result = await acceptInvitation(values).catch(() => null);
    setBusy(false);
    if (!result) setAlert(t.errors.unavailable);
    else if (result.status === "invalid") setErrors(result.fieldErrors);
    else if (result.status === "error") setAlert(t.errors[result.reason]);
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
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
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
          label={t.invite.displayName}
          name="displayName"
          autoComplete="name"
          defaultValue={invitation.displayName}
          error={errors.displayName}
          disabled={busy}
        />
        <TextField
          tone="light"
          label={t.invite.password}
          name="password"
          type="password"
          autoComplete="new-password"
          hint={t.invite.passwordHint}
          error={errors.password}
          disabled={busy}
        />
        <TextField
          tone="light"
          label={t.invite.totpCode}
          name="totpCode"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          error={errors.totpCode}
          disabled={busy}
          className="font-display tracking-[0.3em]"
        />
      </section>

      <FormError message={alert} />
      <Button type="submit" disabled={busy} className="w-full disabled:opacity-70">
        {busy ? t.invite.submitting : t.invite.submit}
      </Button>
    </form>
  );
}
