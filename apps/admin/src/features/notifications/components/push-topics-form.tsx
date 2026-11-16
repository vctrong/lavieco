"use client";

import { useState, type FormEvent } from "react";

import type { PushTopic } from "@lavieco/shared/identity";
import { Button, CheckboxField, FormAlert } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { savePushTopics } from "../actions/push";
import { TEXT } from "../constants/text";

/** Topic choice, for every device of the signed-in staff member. Plain checkbox form. */
export function PushTopicsForm({
  allowedTopics,
  topics,
}: {
  allowedTopics: readonly PushTopic[];
  topics: readonly PushTopic[];
}) {
  const t = TEXT.vi;
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setSaved(false);
    setError(null);
    const result = await callAction(() => savePushTopics(data));
    setBusy(false);
    if (result.status === "ok") setSaved(true);
    else if (result.status === "invalid") setError(t.errors.invalid);
    else
      setError(
        `${t.errors[result.reason]}${"ref" in result && result.ref ? ` (${result.ref})` : ""}`,
      );
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-hairline bg-white p-5">
      <div>
        <h2 className="font-display text-xl text-deep-blue">{t.topics.heading}</h2>
        <p className="text-[14px] text-charcoal/70">{t.topics.lead}</p>
      </div>
      <fieldset className="space-y-1">
        <legend className="sr-only">{t.topics.heading}</legend>
        {allowedTopics.map((topic) => (
          <div key={topic} className="flex min-h-11 flex-col justify-center py-1.5">
            <CheckboxField
              tone="light"
              name="topics"
              value={topic}
              label={t.topics.labels[topic]}
              defaultChecked={topics.includes(topic)}
              className="size-5"
            />
            {t.topics.notes[topic] ? (
              <p className="ml-8 text-[12.5px] text-charcoal/60">{t.topics.notes[topic]}</p>
            ) : null}
          </div>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="deep" className="min-h-11" disabled={busy}>
          {busy ? t.device.working : t.topics.save}
        </Button>
        {saved ? (
          <p role="status" className="text-[14px] text-emerald-ink">
            {t.topics.saved}
          </p>
        ) : null}
      </div>
      <FormAlert message={error} />
    </form>
  );
}
