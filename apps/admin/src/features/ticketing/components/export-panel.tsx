"use client";

import { useState, type FormEvent } from "react";
import { FiDownload, FiShield } from "react-icons/fi";

import { Button, CheckboxField, TextField } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import type { TicketingFailure } from "../types";
import { FormAlert } from "./form-alert";

/**
 * Excel export with step-up (ADR-0017, ADR-0021): the TOTP code goes with the request to
 * the admin Route Handler, which steps up and streams the file. The file is saved from
 * a blob, so a wrong code shows a message instead of leaving the page.
 */
export function ExportPanel({ eventId }: { eventId: string }) {
  const t = TEXT.vi;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim();
    if (!/^\d{6}$/.test(code)) return setAlert(t.stepUp.codeFormat);
    setBusy(true);
    setAlert(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/events/${eventId}/registrations/export`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, includeRefunded: form.get("includeRefunded") === "on" }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          reason?: TicketingFailure;
        } | null;
        setAlert(t.errors[body?.reason ?? "unavailable"] ?? t.errors.unavailable);
        return;
      }
      const name =
        /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ??
        "LAVIECO.xlsx";
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(t.registrations.exported);
      setOpen(false);
    } catch {
      setAlert(t.errors.unavailable);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="space-y-3">
        <Button type="button" variant="deep" size="sm" onClick={() => setOpen(true)}>
          <FiDownload aria-hidden="true" size={14} />
          {t.registrations.export}
        </Button>
        <FormAlert tone="success" message={notice} />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-md space-y-4 rounded-3xl border border-hairline bg-white p-5"
    >
      <h2 className="flex items-center gap-2 font-display text-lg text-deep-blue">
        <FiShield aria-hidden="true" size={16} />
        {t.registrations.exportTitle}
      </h2>
      <p className="text-[13px] leading-relaxed text-charcoal/75">{t.registrations.exportIntro}</p>
      <TextField
        tone="light"
        name="code"
        label={t.stepUp.code}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        disabled={busy}
      />
      <CheckboxField tone="light" name="includeRefunded" label={t.registrations.includeRefunded} />
      <FormAlert message={alert} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="deep" size="sm" disabled={busy}>
          <FiDownload aria-hidden="true" size={14} />
          {busy ? t.registrations.exporting : t.registrations.export}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
          {t.detail.actions.cancel}
        </Button>
      </div>
    </form>
  );
}
