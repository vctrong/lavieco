"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FiMinus, FiPlus, FiX } from "react-icons/fi";

import { VN_PROVINCES } from "@lavieco/shared/geo";
import {
  SALES_CHANNELS,
  SALES_LIMITS,
  SALES_ORDER_STATUSES,
  SALES_ORDER_TYPES,
  SALES_PAYMENT_METHODS,
  SALES_PAYMENT_STATUSES,
  type PriceItem,
  type SalesOrder,
  type StaffRef,
} from "@lavieco/shared/sales";
import {
  AddressPicker,
  BusyLabel,
  Button,
  DraftOfferBanner,
  FormAlert,
  FormErrorNote,
  RequiredNote,
  TextField,
  TextareaField,
  cn,
  useFormErrors,
  useToast,
} from "@lavieco/ui";

import { callAction } from "@/shared/call-action";
import { FORM_TEXT } from "@/shared/constants/form-text";
import { useStaffDraft } from "@/shared/drafts";

import { createSalesOrder, lookupSalesCustomer, updateSalesOrder } from "../actions/sales";
import { TEXT } from "../constants/text";
import {
  ORDER_FIELDS,
  addressValueOf,
  emptyOrderValues,
  orderErrors,
  toOrderInput,
  totalsOf,
  valuesOf,
  type OrderFormValues,
} from "../schemas";
import { failureMessage } from "../utils/failure";
import { money } from "../utils/format";

const t = TEXT.vi;
const f = t.form;

const FIELD_IDS: Record<(typeof ORDER_FIELDS)[number], string> = {
  phone: "order-phone",
  name: "order-name",
  province: "order-address-province",
  ward: "order-address-ward",
  items: "order-items",
  dueDay: "order-due-day",
  discount: "order-discount",
};

/** Radio chips: native radios (arrow keys, screen readers), 44 px targets. */
function Chips<T extends string>({
  legend,
  name,
  value,
  options,
  labels,
  onChange,
  disabled,
}: {
  legend: string;
  name: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-[14px] font-semibold text-charcoal">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option || "none"}
            className={cn(
              "flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-[15px] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-deep-blue",
              value === option
                ? "border-deep-blue bg-deep-blue font-semibold text-soft-white"
                : "border-hairline bg-white text-charcoal hover:border-emerald-brand",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              disabled={disabled}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {labels[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      tabIndex={id ? -1 : undefined}
      className="space-y-4 rounded-3xl border border-hairline bg-white p-4 md:p-5"
    >
      <h2 className="text-[17px] font-semibold text-deep-blue">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Typed quantity next to − / ＋ (a hundred taps is not a way to order 100 pieces). The
 * text stays free while typing; an empty or zero entry goes back to the last quantity on
 * blur instead of removing the line (removing is the − button at 1, or ×).
 */
function QuantityInput({
  name,
  quantity,
  onChange,
}: {
  name: string;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  const [text, setText] = useState(String(quantity));
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : String(quantity);
  return (
    <input
      aria-label={f.quantity(name)}
      inputMode="numeric"
      pattern="[0-9]*"
      value={shown}
      onFocus={(event) => {
        setText(String(quantity));
        setFocused(true);
        event.currentTarget.select();
      }}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
        setText(digits);
        const value = Number(digits);
        if (value >= 1) onChange(Math.min(value, SALES_LIMITS.quantityMax));
      }}
      onBlur={() => setFocused(false)}
      className="h-11 w-14 rounded-xl border border-hairline text-center text-[16px] font-semibold focus-visible:outline-2 focus-visible:outline-deep-blue"
    />
  );
}

let lineSeq = 0;
const newKey = () => `new-${Date.now()}-${(lineSeq += 1)}`;

/**
 * Create or edit a manual order (UC-43): one scrolling page on phones, two columns from
 * 1024 px. Pieces from the price list with − / ＋, chips for the choices, totals and Save
 * stuck to the bottom. Ctrl+Enter saves, Esc closes. Draft kept in IndexedDB.
 */
export function OrderForm({
  order,
  priceItems,
  assignees,
  today,
  closeHref,
}: {
  order: SalesOrder | null;
  priceItems: PriceItem[];
  assignees: StaffRef[];
  today: string;
  closeHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const initial = useMemo(
    () => (order ? valuesOf(order) : emptyOrderValues(today)),
    [order, today],
  );
  const [values, setValues] = useState<OrderFormValues>(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<number | null>(null);
  const [custom, setCustom] = useState({ name: "", price: "" });

  const live = useMemo(() => orderErrors(values), [values]);
  const form = useFormErrors({
    fieldOrder: ORDER_FIELDS,
    fieldId: (key) => FIELD_IDS[key as keyof typeof FIELD_IDS],
    live,
    paused: busy,
  });
  const totals = totalsOf(values);

  const set = <K extends keyof OrderFormValues>(key: K, value: OrderFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const draft = useStaffDraft<OrderFormValues>({
    form: "sales-order",
    record: order?.id ?? "new",
    values,
    dirty,
    revision: order?.revision ?? null,
    onRestore: useCallback((restored: OrderFormValues) => {
      setValues(restored);
      setDirty(true);
    }, []),
  });

  // ---- items
  const addPiece = (item: PriceItem) => {
    setDirty(true);
    setValues((current) => {
      const existing = current.items.find((line) => line.priceItemId === item.id);
      if (existing)
        return {
          ...current,
          items: current.items.map((line) =>
            line === existing ? { ...line, quantity: line.quantity + 1 } : line,
          ),
        };
      return {
        ...current,
        items: [
          ...current.items,
          {
            key: newKey(),
            priceItemId: item.id,
            name: item.name,
            unitPrice: item.price,
            quantity: 1,
          },
        ],
      };
    });
  };
  const changeLine = (key: string, change: { quantity?: number; unitPrice?: number }) =>
    set(
      "items",
      values.items
        .map((line) => (line.key === key ? { ...line, ...change } : line))
        .filter((line) => line.quantity > 0),
    );
  const addCustom = () => {
    const price = Number(custom.price.replace(/[.\s]/g, ""));
    if (!custom.name.trim() || !Number.isInteger(price) || price < 0) return;
    set("items", [
      ...values.items,
      { key: newKey(), priceItemId: null, name: custom.name.trim(), unitPrice: price, quantity: 1 },
    ]);
    setCustom({ name: "", price: "" });
  };
  const quantityOf = (item: PriceItem) =>
    values.items.find((line) => line.priceItemId === item.id)?.quantity ?? 0;

  // ---- returning customer
  const lookup = async () => {
    if (order || values.phone.replace(/\D/g, "").length < 9) return;
    if (values.name.trim() && values.address.detail.trim()) return;
    const result = await callAction(() => lookupSalesCustomer(values.phone));
    if (result.status !== "ok" || !result.data) return;
    const customer = result.data;
    setValues((current) => ({
      ...current,
      name: current.name.trim() ? current.name : customer.name,
      address:
        current.address.provinceCode === null && !current.address.detail.trim()
          ? addressValueOf(customer.address)
          : current.address,
    }));
    setPrefill(customer.orders);
  };

  // ---- save
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    if (!form.check(orderErrors(values))) return;
    setBusy(true);
    setAlert(null);
    const body = toOrderInput(values);
    const result = await callAction(() =>
      order
        ? updateSalesOrder(order.id, { ...body, revision: order.revision })
        : createSalesOrder(body),
    );
    setBusy(false);
    if (result.status === "ok") {
      setDirty(false);
      draft.clear();
      toast({ tone: "success", message: order ? f.updated : f.created(result.data.code) });
      router.push(`/sales/${result.data.id}`);
      router.refresh();
      return;
    }
    if (result.reason === "due_day_required") form.showServerErrors({ dueDay: f.dueRequired });
    else if (result.reason === "totals_invalid")
      form.showServerErrors({ discount: t.errors.totals_invalid });
    setAlert(failureMessage(result));
  };

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void submitRef.current();
      } else if (event.key === "Escape" && !event.defaultPrevented) {
        router.push(closeHref);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, closeHref]);

  const active = priceItems.filter((item) => item.active);
  const count = values.items.reduce((sum, line) => sum + line.quantity, 0);
  const error = form.errors;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="mx-auto max-w-6xl pb-40 md:pb-28">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-deep-blue">
          {order ? f.titleEdit(order.code) : f.titleNew}
        </h1>
        <Link
          href={closeHref}
          aria-label={f.close}
          className="flex size-11 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist focus-visible:outline-2 focus-visible:outline-deep-blue"
        >
          <FiX aria-hidden="true" size={22} />
        </Link>
      </header>
      <DraftOfferBanner
        offer={draft.offer}
        text={FORM_TEXT.vi.draft}
        onRestore={draft.restore}
        onDiscard={draft.discard}
      />
      <div className="mb-4">
        <RequiredNote text={FORM_TEXT.vi.requiredNote} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <Section title={f.customer}>
            <TextField
              id={FIELD_IDS.phone}
              tone="light"
              label={f.phone}
              hint={prefill !== null ? f.prefilled(prefill) : f.phoneHint}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={values.phone}
              error={error.phone}
              onChange={(event) => {
                set("phone", event.target.value);
                setPrefill(null);
              }}
              onBlur={lookup}
              className="text-[16px]"
            />
            <TextField
              id={FIELD_IDS.name}
              tone="light"
              label={f.name}
              required
              autoComplete="off"
              maxLength={100}
              value={values.name}
              error={error.name}
              onChange={(event) => set("name", event.target.value)}
              className="text-[16px]"
            />
            <div>
              <p className="mb-2 text-[14px] font-semibold text-charcoal">{f.address}</p>
              <AddressPicker
                idPrefix="order-address"
                tone="light"
                allowOther
                provinces={VN_PROVINCES}
                value={values.address}
                onChange={(address) => set("address", address)}
                errors={{ province: error.province, ward: error.ward }}
                text={{
                  province: f.province,
                  ward: f.ward,
                  choose: f.choose,
                  other: f.other,
                  detail: f.detail,
                  detailHint: f.detailHint,
                  detailOther: f.detailOther,
                }}
              />
            </div>
          </Section>

          <Section title={f.items} id={FIELD_IDS.items}>
            <p className="text-[14px] text-charcoal/70">{f.itemsHint}</p>
            {active.length === 0 ? (
              <p className="text-[15px] text-charcoal/70">
                {f.noPriceItems}{" "}
                <Link href="/sales/prices" className="font-semibold text-emerald-ink underline">
                  {f.openPrices}
                </Link>
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {active.map((item) => {
                  const quantity = quantityOf(item);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => addPiece(item)}
                        aria-label={f.increase(item.name)}
                        className={cn(
                          "relative flex min-h-16 w-full flex-col items-start justify-center rounded-2xl border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-blue",
                          quantity > 0
                            ? "border-emerald-brand bg-mint-mist"
                            : "border-hairline bg-white hover:border-emerald-brand",
                        )}
                      >
                        <span className="text-[15px] font-medium text-charcoal">{item.name}</span>
                        <span className="text-[13px] text-charcoal/65">{money(item.price)}</span>
                        {quantity > 0 ? (
                          <span className="absolute top-1.5 right-2 rounded-full bg-deep-blue px-2 text-[12px] font-semibold text-soft-white">
                            {f.badge(quantity)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {values.items.length > 0 ? (
              <ul className="divide-y divide-hairline rounded-2xl border border-hairline">
                {values.items.map((line) => (
                  <li key={line.key} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <span className="min-w-0 flex-1 text-[15px] font-medium">{line.name}</span>
                    <label className="sr-only" htmlFor={`price-${line.key}`}>
                      {f.unitPrice(line.name)}
                    </label>
                    <input
                      id={`price-${line.key}`}
                      inputMode="numeric"
                      value={String(line.unitPrice)}
                      onChange={(event) => {
                        const value = Number(event.target.value.replace(/\D/g, "") || "0");
                        changeLine(line.key, { unitPrice: value });
                      }}
                      className="h-11 w-24 rounded-xl border border-hairline px-2 text-right text-[16px] focus-visible:outline-2 focus-visible:outline-deep-blue"
                    />
                    <div className="flex items-center">
                      <button
                        type="button"
                        aria-label={
                          line.quantity === 1 ? f.removeItem(line.name) : f.decrease(line.name)
                        }
                        onClick={() => changeLine(line.key, { quantity: line.quantity - 1 })}
                        className="flex size-11 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist focus-visible:outline-2 focus-visible:outline-deep-blue"
                      >
                        {line.quantity === 1 ? (
                          <FiX aria-hidden="true" />
                        ) : (
                          <FiMinus aria-hidden="true" />
                        )}
                      </button>
                      <QuantityInput
                        name={line.name}
                        quantity={line.quantity}
                        onChange={(quantity) => changeLine(line.key, { quantity })}
                      />
                      <button
                        type="button"
                        aria-label={f.increase(line.name)}
                        onClick={() => changeLine(line.key, { quantity: line.quantity + 1 })}
                        className="flex size-11 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist focus-visible:outline-2 focus-visible:outline-deep-blue"
                      >
                        <FiPlus aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            {error.items ? (
              <p className="text-[14px] font-medium text-error" role="alert">
                {error.items}
              </p>
            ) : null}

            <details className="rounded-2xl border border-dashed border-hairline">
              <summary className="flex min-h-11 cursor-pointer items-center px-3 text-[15px] text-deep-blue">
                {f.custom}
              </summary>
              <div className="flex flex-wrap items-end gap-2 px-3 pb-3">
                <TextField
                  tone="light"
                  label={f.customName}
                  value={custom.name}
                  maxLength={120}
                  onChange={(event) => setCustom({ ...custom, name: event.target.value })}
                  wrapperClassName="min-w-40 flex-1"
                  className="text-[16px]"
                />
                <TextField
                  tone="light"
                  label={f.customPrice}
                  inputMode="numeric"
                  value={custom.price}
                  onChange={(event) => setCustom({ ...custom, price: event.target.value })}
                  wrapperClassName="w-32"
                  className="text-[16px]"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-11 px-4"
                  onClick={addCustom}
                >
                  {f.addCustom}
                </Button>
              </div>
            </details>
          </Section>
        </div>

        <Section title={f.details}>
          <Chips
            legend={f.type}
            name="orderType"
            value={values.orderType}
            options={SALES_ORDER_TYPES}
            labels={t.labels.type}
            onChange={(v) => set("orderType", v)}
          />
          <Chips
            legend={f.channel}
            name="channel"
            value={values.channel}
            options={SALES_CHANNELS}
            labels={t.labels.channel}
            onChange={(v) => set("channel", v)}
          />
          <Chips
            legend={f.status}
            name="status"
            value={values.status}
            options={SALES_ORDER_STATUSES}
            labels={t.labels.status}
            onChange={(v) => set("status", v)}
          />
          <Chips
            legend={f.paymentMethod}
            name="paymentMethod"
            value={values.paymentMethod}
            options={["", ...SALES_PAYMENT_METHODS] as const}
            labels={{ "": t.detail.noMethod, ...t.labels.method }}
            onChange={(v) => set("paymentMethod", v)}
          />
          <Chips
            legend={f.paymentStatus}
            name="paymentStatus"
            value={values.paymentStatus}
            options={SALES_PAYMENT_STATUSES}
            labels={t.labels.payment}
            onChange={(v) => set("paymentStatus", v)}
          />
          <Chips
            legend={f.assignee}
            name="assigneeId"
            value={values.assigneeId}
            options={["", ...assignees.map((staff) => staff.id)]}
            labels={Object.fromEntries([
              ["", f.nobody],
              ...assignees.map((staff) => [staff.id, staff.name]),
            ])}
            onChange={(v) => set("assigneeId", v)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              tone="light"
              label={f.orderDay}
              type="date"
              value={values.orderDay}
              onChange={(event) => set("orderDay", event.target.value)}
              className="text-[16px]"
            />
            <TextField
              id={FIELD_IDS.dueDay}
              tone="light"
              label={f.dueDay}
              type="date"
              required={values.orderType === "made_to_order" && values.status !== "cancelled"}
              value={values.dueDay}
              error={error.dueDay}
              onChange={(event) => set("dueDay", event.target.value)}
              className="text-[16px]"
            />
            <TextField
              tone="light"
              label={f.shippingFee}
              inputMode="numeric"
              value={values.shippingFee}
              onChange={(event) => set("shippingFee", event.target.value)}
              className="text-[16px]"
            />
            <TextField
              id={FIELD_IDS.discount}
              tone="light"
              label={f.discount}
              inputMode="numeric"
              value={values.discount}
              error={error.discount}
              onChange={(event) => set("discount", event.target.value)}
              className="text-[16px]"
            />
          </div>
          <TextareaField
            tone="light"
            label={f.note}
            rows={3}
            maxLength={1000}
            value={values.note}
            onChange={(event) => set("note", event.target.value)}
            className="text-[16px]"
          />
        </Section>
      </div>

      {alert ? <FormAlert message={alert} className="mt-4" /> : null}

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-hairline bg-soft-white/95 px-4 py-3 backdrop-blur md:bottom-0 lg:pl-[calc(17rem+2.5rem)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] text-charcoal/65">
              {f.total} · {f.itemsCount(count)}
            </p>
            <p className="text-[20px] font-semibold text-deep-blue">{money(totals.total)}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <FormErrorNote
              message={
                form.invalidFields.length
                  ? FORM_TEXT.vi.aboveSubmit(form.invalidFields.length)
                  : null
              }
              announcement={
                form.invalidFields.length ? FORM_TEXT.vi.announce(form.invalidFields.length) : null
              }
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="min-h-12 px-8"
              aria-describedby="order-save-shortcut"
            >
              <BusyLabel busy={busy} idle={f.save} sending={f.saving} />
            </Button>
            <span id="order-save-shortcut" className="hidden text-[12px] text-charcoal/55 md:block">
              {f.saveShortcut}
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}
