"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FiCopy, FiDownload, FiLink, FiPlay, FiSquare } from "react-icons/fi";

import { SURVEY_EXPORT_FORMATS, type SurveyStatus, type SurveyView } from "@lavieco/shared/events";
import { Button, FormAlert, SelectField, TextField } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { duplicateSurvey, setSurveyStatus } from "../actions/surveys";
import { TEXT } from "../constants/text";
import type { SurveyFailure } from "../types";

const t = TEXT.vi;
const ACTION =
  "inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist disabled:opacity-50";

export function SurveyActions({ survey }: { survey: SurveyView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  const status = async (next: SurveyStatus) => {
    setBusy(true);
    setAlert(null);
    const result = await callAction(() =>
      setSurveyStatus(survey.id, { status: next, revision: survey.revision }),
    );
    setBusy(false);
    if (result.status === "ok") router.refresh();
    else setAlert(result.status === "error" ? t.errors[result.reason] : t.errors.invalid);
  };
  const copy = async () => {
    setBusy(true);
    setAlert(null);
    const result = await callAction(() => duplicateSurvey(survey.id));
    setBusy(false);
    if (result.status === "ok") router.push(`/surveys/${result.data.id}`);
    else setAlert(result.status === "error" ? t.errors[result.reason] : t.errors.invalid);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {survey.status === "open" ? (
          <button type="button" className={ACTION} disabled={busy} onClick={() => status("closed")}>
            <FiSquare aria-hidden="true" size={13} />
            {t.actions.close}
          </button>
        ) : (
          <button type="button" className={ACTION} disabled={busy} onClick={() => status("open")}>
            <FiPlay aria-hidden="true" size={13} />
            {survey.status === "draft" ? t.actions.open : t.actions.reopen}
          </button>
        )}
        <button type="button" className={ACTION} disabled={busy} onClick={copy}>
          <FiCopy aria-hidden="true" size={13} />
          {t.actions.duplicate}
        </button>
      </div>
      <FormAlert message={alert} />
    </div>
  );
}

export function CopySurveyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={ACTION}
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }}
    >
      <FiLink aria-hidden="true" size={13} />
      {copied ? t.share.copied : t.share.copy}
    </button>
  );
}

export function PrintPage() {
  return (
    <Button type="button" size="sm" className="print:hidden" onClick={() => window.print()}>
      {t.share.print}
    </Button>
  );
}

/** Step-up in a small form, then the file through the BFF route. */
export function SurveyExport({ surveyId }: { surveyId: string }) {
  const r = t.results;
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim();
    if (!/^\d{6}$/.test(code)) return setAlert(r.badCode);
    setBusy(true);
    setAlert(null);
    setDone(false);
    try {
      const response = await fetch(`/api/surveys/${surveyId}/export`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, format: form.get("format") }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          reason?: SurveyFailure;
        } | null;
        setAlert(t.errors[body?.reason ?? "unavailable"]);
        return;
      }
      const name =
        /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ??
        "LAVIECO-khao-sat";
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch {
      setAlert(t.errors.unavailable);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-3xl border border-hairline bg-white p-5">
      <h2 className="font-display text-xl text-deep-blue">{r.exportTitle}</h2>
      <p className="mt-1 text-[12.5px] text-charcoal/65">{r.exportHint}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
        <TextField
          tone="light"
          name="code"
          label={r.code}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
        />
        <SelectField
          tone="light"
          name="format"
          label={r.format}
          defaultValue="xlsx"
          options={SURVEY_EXPORT_FORMATS.map((value) => ({
            value,
            label: value.toUpperCase(),
          }))}
        />
        <Button type="submit" variant="deep" size="sm" disabled={busy} className="h-10.5">
          <FiDownload aria-hidden="true" size={14} />
          {busy ? r.exporting : r.export}
        </Button>
      </div>
      <div className="mt-3">
        <FormAlert message={alert} />
        {done ? (
          <p role="status" className="text-[13px] font-medium text-emerald-ink">
            {r.exported}
          </p>
        ) : null}
      </div>
    </form>
  );
}
