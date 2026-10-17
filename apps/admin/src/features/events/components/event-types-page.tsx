"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FiArchive, FiArrowLeft, FiRotateCcw } from "react-icons/fi";

import { eventTypeCreateRequestSchema, type EventType } from "@lavieco/shared/events";
import { Button, TextField, cn } from "@lavieco/ui";

import { createEventType, updateEventType } from "../actions/event-types";
import { TEXT } from "../constants/text";
import { fieldErrorsOf } from "../schemas";
import type { ActionResult } from "../types";
import { FormAlert } from "./form-alert";
import { PageHeader } from "./page-header";

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const run = async (action: () => Promise<ActionResult>) => {
    setBusy(true);
    setAlert(null);
    const result = await action().catch(() => null);
    setBusy(false);
    if (result?.status === "ok") {
      router.refresh();
      return true;
    }
    setAlert(result?.status === "error" ? TEXT.vi.errors[result.reason] : TEXT.vi.errors.invalid);
    return false;
  };
  return { busy, alert, run };
}

function TypeRow({ type, canWrite }: { type: EventType; canWrite: boolean }) {
  const t = TEXT.vi.types;
  const [name, setName] = useState(type.name.vi);
  const { busy, alert, run } = useAction();
  const rename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(() =>
      updateEventType(type.id, { revision: type.revision, name: { ...type.name, vi: name } }),
    );
  };
  return (
    <li
      className={cn(
        "border-b border-hairline px-5 py-4 last:border-b-0",
        type.archived && "bg-soft-white",
      )}
    >
      <form onSubmit={rename} className="flex flex-wrap items-end gap-3">
        <TextField
          tone="light"
          label={t.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canWrite || busy}
          wrapperClassName="min-w-56 flex-1"
        />
        <span className="pb-3 font-mono text-[12px] text-charcoal/50">{type.key}</span>
        {type.archived ? (
          <span className="mb-2.5 rounded-full bg-deep-blue/10 px-2.5 py-1 text-[11.5px] font-semibold text-deep-blue/70">
            {t.archived}
          </span>
        ) : null}
        {canWrite ? (
          <div className="flex gap-2 pb-0.5">
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={busy || name.trim() === type.name.vi}
            >
              {t.rename}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                run(() =>
                  updateEventType(type.id, { revision: type.revision, archived: !type.archived }),
                )
              }
            >
              {type.archived ? (
                <FiRotateCcw aria-hidden="true" size={13} />
              ) : (
                <FiArchive aria-hidden="true" size={13} />
              )}
              {type.archived ? t.restore : t.archive}
            </Button>
          </div>
        ) : null}
      </form>
      <FormAlert message={alert} className="mt-2" />
    </li>
  );
}

/** `/events/types`: program types (D3), managed with `program:write`. */
export function EventTypesPage({ types, canWrite }: { types: EventType[]; canWrite: boolean }) {
  const t = TEXT.vi.types;
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, alert, run } = useAction();

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = {
      name: nameEn.trim() ? { vi: name, en: nameEn } : { vi: name },
      sortOrder: (types.at(-1)?.sortOrder ?? 0) + 10,
    };
    const parsed = eventTypeCreateRequestSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    setErrors({});
    if (await run(() => createEventType(input))) {
      setName("");
      setNameEn("");
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        intro={t.intro}
        back={
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-deep-blue/70 hover:text-deep-blue"
          >
            <FiArrowLeft aria-hidden="true" size={13} />
            {t.back}
          </Link>
        }
      />
      <ul className="overflow-hidden rounded-3xl border border-hairline bg-white shadow-ambient">
        {types.map((type) => (
          <TypeRow key={`${type.id}-${type.revision}`} type={type} canWrite={canWrite} />
        ))}
      </ul>
      {canWrite ? (
        <form
          onSubmit={create}
          noValidate
          className="mt-6 grid gap-4 rounded-3xl border border-hairline bg-white p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
        >
          <TextField
            tone="light"
            label={t.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors["name.vi"]}
            disabled={busy}
          />
          <TextField
            tone="light"
            label={t.nameEn}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            disabled={busy}
          />
          <Button type="submit" size="sm" disabled={busy} className="h-10.5">
            {t.add}
          </Button>
          <FormAlert message={alert} className="md:col-span-3" />
        </form>
      ) : null}
    </div>
  );
}
