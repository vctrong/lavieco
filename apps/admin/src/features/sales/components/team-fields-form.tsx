"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FiX } from "react-icons/fi";

import type { SalesOrder, StaffRef } from "@lavieco/shared/sales";
import {
  BusyLabel,
  Button,
  FormAlert,
  SelectField,
  TextField,
  TextareaField,
  useToast,
} from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { updateSalesOrderTeam } from "../actions/sales";
import { TEXT } from "../constants/text";
import { failureMessage } from "../utils/failure";

const t = TEXT.vi;

/** A website order: only who handles it, when it is due and the team's note (ADR-0030). */
export function TeamFieldsForm({
  order,
  assignees,
  closeHref,
}: {
  order: SalesOrder;
  assignees: StaffRef[];
  closeHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setAlert(null);
    const result = await callAction(() =>
      updateSalesOrderTeam(order.id, {
        revision: order.revision,
        assigneeId: String(data.get("assigneeId") ?? "") || null,
        dueDay: String(data.get("dueDay") ?? "") || null,
        note: String(data.get("note") ?? ""),
      }),
    );
    setBusy(false);
    if (result.status === "ok") {
      toast({ tone: "success", message: t.form.updated });
      router.push(closeHref);
      router.refresh();
    } else setAlert(failureMessage(result));
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-deep-blue">{t.form.titleEdit(order.code)}</h1>
        <Link
          href={closeHref}
          aria-label={t.form.close}
          className="flex size-11 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist"
        >
          <FiX aria-hidden="true" size={22} />
        </Link>
      </header>
      <p className="rounded-2xl bg-mint-mist px-4 py-3 text-[14px]">{t.detail.webOrder}</p>
      <div className="space-y-4 rounded-3xl border border-hairline bg-white p-5">
        <SelectField
          tone="light"
          name="assigneeId"
          label={t.form.assignee}
          defaultValue={order.assignee?.id ?? ""}
          options={[
            { value: "", label: t.form.nobody },
            ...assignees.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <TextField
          tone="light"
          name="dueDay"
          type="date"
          label={t.form.dueDay}
          defaultValue={order.dueDay ?? ""}
          className="text-[16px]"
        />
        <TextareaField
          tone="light"
          name="note"
          rows={3}
          maxLength={1000}
          label={t.form.note}
          defaultValue={order.note}
          className="text-[16px]"
        />
      </div>
      {alert ? <FormAlert message={alert} /> : null}
      <Button type="submit" variant="primary" className="min-h-12 w-full sm:w-auto">
        <BusyLabel busy={busy} idle={t.form.save} sending={t.form.saving} />
      </Button>
    </form>
  );
}
