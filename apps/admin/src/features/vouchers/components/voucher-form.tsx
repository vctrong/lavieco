"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import {
  VOUCHER_DISCOUNT_TYPES,
  VOUCHER_ELIGIBILITIES,
  VOUCHER_LIMITS,
  VOUCHER_SCOPES,
  VOUCHER_VISIBILITIES,
  type VoucherView,
} from "@lavieco/shared/events";
import { Button, FormAlert, SelectField, TextareaField, TextField } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { createVoucher, updateVoucher } from "../actions/vouchers";
import { TEXT } from "../constants/text";
import {
  emptyValues,
  toVoucherRequest,
  valuesOf,
  type VoucherFormValues,
} from "../utils/form-values";

const t = TEXT.vi;

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-hairline bg-white p-5 shadow-ambient md:p-7">
      <h2 className="mb-5 font-display text-xl text-deep-blue">{title}</h2>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

type VoucherFormProps = {
  voucher: VoucherView | null;
  /** New voucher started from an event's editor: that event is already chosen. */
  presetEventId?: string | null;
  events: { id: string; title: string }[];
};

/** "Ưu đãi": create or edit. The service decides what is allowed once a code was used. */
export function VoucherForm({ voucher, presetEventId = null, events }: VoucherFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<VoucherFormValues>(() =>
    voucher ? valuesOf(voucher) : emptyValues(presetEventId),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const used = voucher !== null && voucher.used + voucher.held > 0;

  const set = <K extends keyof VoucherFormValues>(key: K, value: VoucherFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const text = (key: keyof VoucherFormValues) => ({
    value: String(values[key]),
    onChange: (event: { target: { value: string } }) =>
      set(key, event.target.value as VoucherFormValues[typeof key]),
    error: errors[key],
    disabled: busy,
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setAlert(null);
    setErrors({});
    const body = toVoucherRequest(values);
    const result = await callAction(() =>
      voucher
        ? updateVoucher(voucher.id, { ...body, revision: voucher.revision })
        : createVoucher(body),
    );
    setBusy(false);
    if (result.status === "ok") {
      if (voucher) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/vouchers/${result.data.id}`);
      }
      return;
    }
    if (result.status === "invalid") {
      setErrors(result.fieldErrors);
      setAlert(t.errors.invalid);
      return;
    }
    setAlert(t.errors[result.reason]);
  };

  const option = <K extends string>(keys: readonly K[], labels: Record<K, string>) =>
    keys.map((key) => ({ value: key, label: labels[key] }));

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Group title={t.form.identity}>
        <TextField
          tone="light"
          label={t.form.code}
          hint={t.form.codeHint}
          maxLength={VOUCHER_LIMITS.codeMax}
          {...text("code")}
          onChange={(event) => set("code", event.target.value.toUpperCase())}
          disabled={busy || used}
        />
        <TextField
          tone="light"
          label={t.form.name}
          maxLength={VOUCHER_LIMITS.nameMax}
          {...text("name")}
        />
        <TextareaField
          tone="light"
          rows={2}
          label={t.form.description}
          maxLength={VOUCHER_LIMITS.descriptionMax}
          wrapperClassName="md:col-span-2"
          {...text("description")}
        />
      </Group>

      <Group title={t.form.scopeTitle}>
        <SelectField
          tone="light"
          label={t.filters.scope}
          options={option(VOUCHER_SCOPES, t.scope)}
          {...text("scope")}
        />
        {values.scope === "event" ? (
          <>
            <SelectField
              tone="light"
              label={t.form.eventId}
              options={[
                { value: "", label: t.form.eventIdPlaceholder },
                ...events.map((item) => ({ value: item.id, label: item.title })),
              ]}
              {...text("eventId")}
            />
            <TextField
              tone="light"
              label={t.form.ticketTypeIds}
              wrapperClassName="md:col-span-2"
              {...text("ticketTypeIds")}
            />
          </>
        ) : (
          <TextField tone="light" label={t.form.excludedEventIds} {...text("excludedEventIds")} />
        )}
      </Group>

      <Group title={t.form.discountTitle}>
        <SelectField
          tone="light"
          label={t.form.discountTitle}
          options={option(VOUCHER_DISCOUNT_TYPES, t.discountType)}
          {...text("discountType")}
        />
        <TextField tone="light" inputMode="numeric" label={t.form.value} {...text("value")} />
        {values.discountType === "percent" ? (
          <TextField
            tone="light"
            inputMode="numeric"
            label={t.form.maxDiscount}
            {...text("maxDiscount")}
          />
        ) : null}
      </Group>

      <Group title={t.form.conditions}>
        <TextField tone="light" inputMode="numeric" label={t.form.minSeats} {...text("minSeats")} />
        <TextField
          tone="light"
          inputMode="numeric"
          label={t.form.minSubtotal}
          {...text("minSubtotal")}
        />
      </Group>

      <Group title={t.form.audience}>
        <SelectField
          tone="light"
          label={t.form.audience}
          options={option(VOUCHER_ELIGIBILITIES, t.eligibility)}
          {...text("eligibility")}
        />
        {values.eligibility === "loyal" ? (
          <TextField
            tone="light"
            inputMode="numeric"
            label={t.form.minPaidOrders}
            {...text("minPaidOrders")}
          />
        ) : null}
        {values.eligibility === "allowlist" ? (
          <TextareaField
            tone="light"
            rows={5}
            label={t.form.allowlist}
            hint={t.form.allowlistHint}
            wrapperClassName="md:col-span-2"
            {...text("allowlist")}
          />
        ) : null}
      </Group>

      <Group title={t.form.limits}>
        <TextField
          tone="light"
          inputMode="numeric"
          label={t.form.totalUses}
          {...text("totalUses")}
        />
        <TextField
          tone="light"
          inputMode="numeric"
          label={t.form.perCustomer}
          {...text("perCustomer")}
        />
        <TextField
          tone="light"
          type="datetime-local"
          label={t.form.startAt}
          {...text("startLocal")}
        />
        <TextField tone="light" type="datetime-local" label={t.form.endAt} {...text("endLocal")} />
        <SelectField
          tone="light"
          label={t.form.visibilityTitle}
          wrapperClassName="md:col-span-2"
          options={option(VOUCHER_VISIBILITIES, t.visibility)}
          {...text("visibility")}
        />
      </Group>

      <FormAlert message={alert} />
      {saved ? (
        <p role="status" className="text-[13px] font-medium text-emerald-ink">
          {t.form.saved}
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        {busy ? t.form.saving : t.form.save}
      </Button>
    </form>
  );
}
