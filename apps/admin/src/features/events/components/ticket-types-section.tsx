"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FiEdit2, FiEyeOff, FiLock, FiPlus } from "react-icons/fi";

import {
  EVENT_LIMITS,
  ticketTypeCreateRequestSchema,
  type EventView,
  type TicketType,
} from "@lavieco/shared/events";
import { Button, CheckboxField, TextField } from "@lavieco/ui";

import { createTicketType, updateTicketType } from "../actions/ticket-types";
import { TEXT } from "../constants/text";
import { fieldErrorsOf } from "../schemas";
import { formatVnd, isoToVietnamLocal, vietnamLocalToIso } from "../utils/format";
import { EditorSection } from "./editor-section";
import { FormAlert } from "./form-alert";

type TicketValues = {
  name: string;
  description: string;
  price: string;
  quantity: string;
  maxPerOrder: string;
  saleStartLocal: string;
  saleEndLocal: string;
  hidden: boolean;
  sortOrder: number;
};

const toInt = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN);

function valuesOf(ticket: TicketType | null, sortOrder: number): TicketValues {
  return {
    name: ticket?.name ?? "",
    description: ticket?.description ?? "",
    price: ticket ? String(ticket.price) : "",
    quantity: ticket?.quantity == null ? "" : String(ticket.quantity),
    maxPerOrder: ticket ? String(ticket.maxPerOrder) : "4",
    saleStartLocal: isoToVietnamLocal(ticket?.saleStartAt ?? null),
    saleEndLocal: isoToVietnamLocal(ticket?.saleEndAt ?? null),
    hidden: ticket?.hidden ?? false,
    sortOrder: ticket?.sortOrder ?? sortOrder,
  };
}

function toRequest(values: TicketValues) {
  return {
    name: values.name,
    description: values.description,
    price: toInt(values.price),
    quantity: values.quantity.trim() === "" ? null : toInt(values.quantity),
    maxPerOrder: toInt(values.maxPerOrder),
    saleStartAt: values.saleStartLocal ? vietnamLocalToIso(values.saleStartLocal) : null,
    saleEndAt: values.saleEndLocal ? vietnamLocalToIso(values.saleEndLocal) : null,
    sortOrder: values.sortOrder,
    hidden: values.hidden,
  };
}

function TicketForm({
  eventId,
  ticket,
  sortOrder,
  onDone,
}: {
  eventId: string;
  ticket: TicketType | null;
  sortOrder: number;
  onDone: () => void;
}) {
  const t = TEXT.vi;
  const router = useRouter();
  const [values, setValues] = useState(() => valuesOf(ticket, sortOrder));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = ticket !== null && ticket.sold + ticket.held > 0;
  const set = <K extends keyof TicketValues>(key: K, value: TicketValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (busy) return;
    const body = toRequest(values);
    const parsed = ticketTypeCreateRequestSchema.safeParse(body);
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
    setErrors({});
    setBusy(true);
    const result = await (
      ticket
        ? updateTicketType(eventId, ticket.id, { ...body, revision: ticket.revision })
        : createTicketType(eventId, body)
    ).catch(() => null);
    setBusy(false);
    if (result?.status === "ok") {
      router.refresh();
      onDone();
      return;
    }
    if (result?.status === "invalid") setErrors(result.fieldErrors);
    setAlert(result?.status === "error" ? t.errors[result.reason] : t.errors.invalid);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-2xl border border-emerald-brand/40 bg-soft-white p-4"
    >
      {locked ? (
        <p className="flex items-center gap-2 text-[12.5px] text-deep-blue/75">
          <FiLock aria-hidden="true" size={13} />
          {t.tickets.locked}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-4">
        <TextField
          tone="light"
          label={t.tickets.name}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
          wrapperClassName="md:col-span-2"
        />
        <TextField
          tone="light"
          inputMode="numeric"
          label={t.tickets.price}
          value={values.price}
          onChange={(e) => set("price", e.target.value)}
          error={errors.price}
          disabled={locked}
        />
        <TextField
          tone="light"
          inputMode="numeric"
          label={t.tickets.quantity}
          hint={t.tickets.quantityHint}
          value={values.quantity}
          onChange={(e) => set("quantity", e.target.value)}
          error={errors.quantity}
        />
        <TextField
          tone="light"
          label={t.tickets.description}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          error={errors.description}
          wrapperClassName="md:col-span-4"
        />
        <TextField
          tone="light"
          inputMode="numeric"
          label={t.tickets.maxPerOrder}
          value={values.maxPerOrder}
          onChange={(e) => set("maxPerOrder", e.target.value)}
          error={errors.maxPerOrder}
        />
        <TextField
          tone="light"
          type="datetime-local"
          label={t.tickets.saleStartAt}
          value={values.saleStartLocal}
          onChange={(e) => set("saleStartLocal", e.target.value)}
          error={errors.saleStartAt}
        />
        <TextField
          tone="light"
          type="datetime-local"
          label={t.tickets.saleEndAt}
          value={values.saleEndLocal}
          onChange={(e) => set("saleEndLocal", e.target.value)}
          error={errors.saleEndAt}
        />
        <CheckboxField
          tone="light"
          label={t.tickets.hidden}
          checked={values.hidden}
          onChange={(e) => set("hidden", e.target.checked)}
          wrapperClassName="self-end pb-3"
        />
      </div>
      <FormAlert message={alert} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          {t.tickets.cancel}
        </Button>
        <Button type="submit" size="sm" disabled={busy} className="disabled:opacity-70">
          {busy ? t.editor.saving : t.tickets.save}
        </Button>
      </div>
    </form>
  );
}

function TicketSummary({
  ticket,
  onEdit,
  canEdit,
}: {
  ticket: TicketType;
  onEdit: () => void;
  canEdit: boolean;
}) {
  const t = TEXT.vi;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-hairline p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-semibold text-deep-blue">
          {ticket.name}
          {ticket.hidden ? (
            <FiEyeOff aria-label={t.tickets.hidden} size={14} className="text-deep-blue/50" />
          ) : null}
        </p>
        <p className="mt-0.5 text-[12.5px] text-charcoal/65">
          {ticket.price === 0 ? t.free : formatVnd(ticket.price)} ·{" "}
          {ticket.quantity === null ? t.list.unlimited : t.tickets.seats(ticket.quantity)} ·{" "}
          {t.tickets.sold(ticket.sold, ticket.held)}
        </p>
      </div>
      {canEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist"
        >
          <FiEdit2 aria-hidden="true" size={13} />
          {t.tickets.edit}
        </button>
      ) : null}
    </div>
  );
}

/** Section 7: ticket types, each saved on its own (they have their own revision). */
export function TicketTypesSection({ event, canWrite }: { event: EventView; canWrite: boolean }) {
  const t = TEXT.vi;
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const blocked =
    event.kind === "past" ? t.tickets.pastEvent : event.status === "ended" ? t.tickets.ended : null;
  const canEdit = canWrite && blocked === null;
  const nextSort = (event.ticketTypes.at(-1)?.sortOrder ?? -10) + 10;

  return (
    <EditorSection
      id="loai-ve"
      index={7}
      title={t.editor.sections.tickets}
      hint={t.editor.sections.ticketsHint}
      aside={
        canEdit && editing === null && event.ticketTypes.length < EVENT_LIMITS.ticketTypesMax ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditing("new")}>
            <FiPlus aria-hidden="true" size={14} />
            {t.tickets.add}
          </Button>
        ) : null
      }
    >
      {blocked ? (
        <p className="rounded-2xl bg-soft-white px-4 py-3 text-[13px] text-charcoal/70">
          {blocked}
        </p>
      ) : null}
      <div className="space-y-3">
        {event.ticketTypes.map((ticket) =>
          editing === ticket.id ? (
            <TicketForm
              key={ticket.id}
              eventId={event.id}
              ticket={ticket}
              sortOrder={ticket.sortOrder}
              onDone={() => setEditing(null)}
            />
          ) : (
            <TicketSummary
              key={ticket.id}
              ticket={ticket}
              canEdit={canEdit && editing === null}
              onEdit={() => setEditing(ticket.id)}
            />
          ),
        )}
        {editing === "new" ? (
          <TicketForm
            eventId={event.id}
            ticket={null}
            sortOrder={nextSort}
            onDone={() => setEditing(null)}
          />
        ) : null}
        {event.ticketTypes.length === 0 && editing !== "new" && blocked === null ? (
          <p className="text-[13px] text-charcoal/60">{t.tickets.empty}</p>
        ) : null}
      </div>
    </EditorSection>
  );
}
