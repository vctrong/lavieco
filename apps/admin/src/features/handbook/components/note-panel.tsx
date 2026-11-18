"use client";

import { useState, type ReactNode } from "react";
import { FiAlertTriangle } from "react-icons/fi";

import { Button, FormAlert, TextareaField } from "@lavieco/ui";

import { TEXT } from "../constants/text";

const p = TEXT.vi.publish;

/**
 * Inline confirmation with the required release note (D1), used to publish a draft and
 * to restore an old version. Errors stay next to the field; nothing is blocked early.
 */
export function NotePanel({
  heading,
  body,
  confirmLabel,
  warning,
  extra,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  heading: string;
  body: string;
  confirmLabel: string;
  warning?: string | null;
  extra?: ReactNode;
  busy: boolean;
  error: string | null;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | undefined>(undefined);

  return (
    <section
      aria-labelledby="note-panel-heading"
      className="space-y-4 rounded-3xl border border-emerald-brand/40 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 id="note-panel-heading" className="font-display text-xl text-deep-blue">
          {heading}
        </h2>
        <p className="mt-1 text-[14px] text-charcoal/75">{body}</p>
      </div>
      {warning ? (
        <p className="flex items-start gap-2 rounded-2xl bg-canary/40 px-4 py-3 text-[13px] text-charcoal">
          <FiAlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
          {warning}
        </p>
      ) : null}
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const value = String(new FormData(event.currentTarget).get("note") ?? "").trim();
          if (value.length < 3) {
            setNoteError(p.noteRequired);
            document.getElementById("handbook-release-note")?.focus();
            return;
          }
          setNoteError(undefined);
          onConfirm(value);
        }}
      >
        <TextareaField
          id="handbook-release-note"
          name="note"
          tone="light"
          label={p.note}
          placeholder={p.notePlaceholder}
          required
          rows={2}
          maxLength={300}
          value={note}
          error={noteError}
          onChange={(event) => setNote(event.target.value)}
        />
        {extra}
        <FormAlert tone="error" message={error} surface="light" />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            {confirmLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            {p.cancel}
          </Button>
        </div>
      </form>
    </section>
  );
}
