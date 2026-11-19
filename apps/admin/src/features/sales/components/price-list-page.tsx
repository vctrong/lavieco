"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { FiPlus } from "react-icons/fi";

import type { PriceItem } from "@lavieco/shared/sales";
import { BusyLabel, Button, TextField, choiceControlClass, cn, useToast } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { createPriceItem, updatePriceItem } from "../actions/sales";
import { TEXT } from "../constants/text";
import { failureMessage } from "../utils/failure";
import { SalesShell } from "./sales-shell";

const t = TEXT.vi.prices;

const parsePrice = (text: string) => {
  const value = Number(text.replace(/[.\s]/g, ""));
  return Number.isInteger(value) && value >= 0 ? value : null;
};

/** One entry, edited in place: blur or Enter saves the field that changed. */
function PriceRow({ item }: { item: PriceItem }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startTransition] = useTransition();
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));

  const save = (change: { name?: string; price?: number; active?: boolean }) =>
    startTransition(async () => {
      const result = await callAction(() =>
        updatePriceItem(item.id, { revision: item.revision, ...change }),
      );
      if (result.status === "ok") {
        toast({ tone: "success", message: t.saved });
        router.refresh();
      } else {
        toast({ tone: "error", message: failureMessage(result) });
        setName(item.name);
        setPrice(String(item.price));
      }
    });

  const commitName = () => {
    const value = name.trim();
    if (value && value !== item.name) save({ name: value });
    else setName(item.name);
  };
  const commitPrice = () => {
    const value = parsePrice(price);
    if (value !== null && value !== item.price) save({ price: value });
    else setPrice(String(item.price));
  };
  const onEnter = (commit: () => void) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  };

  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-2 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]",
        !item.active && "bg-charcoal/4",
      )}
      aria-busy={busy}
    >
      <input
        aria-label={`${t.name}: ${item.name}`}
        value={name}
        maxLength={120}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={onEnter(commitName)}
        className="min-h-11 rounded-xl border border-transparent bg-transparent px-2 text-[16px] hover:border-hairline focus:border-hairline focus:bg-white focus-visible:outline-2 focus-visible:outline-deep-blue"
      />
      <input
        aria-label={`${t.price}: ${item.name}`}
        inputMode="numeric"
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        onBlur={commitPrice}
        onKeyDown={onEnter(commitPrice)}
        className="min-h-11 rounded-xl border border-transparent bg-transparent px-2 text-right text-[16px] font-medium hover:border-hairline focus:border-hairline focus:bg-white focus-visible:outline-2 focus-visible:outline-deep-blue"
      />
      <label className="col-span-2 flex min-h-11 items-center gap-2 text-[14px] text-charcoal sm:col-span-1 sm:justify-end">
        <input
          type="checkbox"
          checked={item.active}
          disabled={busy}
          onChange={(event) => save({ active: event.target.checked })}
          className={choiceControlClass("light", "size-5")}
        />
        {item.active ? t.active : t.inactive}
      </label>
    </li>
  );
}

/** `/sales/prices` (UC-44): the internal price list, sorted as entered. */
export function PriceListPage({ items }: { items: PriceItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ name?: string; price?: string }>({});

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const name = String(data.get("name") ?? "").trim();
    const price = parsePrice(String(data.get("price") ?? ""));
    const found = {
      ...(name ? {} : { name: TEXT.vi.form.nameRequired }),
      ...(price === null ? { price: TEXT.vi.form.amountInvalid } : {}),
    };
    setError(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    const result = await callAction(() => createPriceItem({ name, price: price ?? 0 }));
    setBusy(false);
    if (result.status === "ok") {
      formElement.reset();
      toast({ tone: "success", message: t.saved });
      router.refresh();
    } else toast({ tone: "error", message: failureMessage(result) });
  };

  return (
    <SalesShell section="prices" title={t.title} intro={t.intro}>
      <form
        onSubmit={add}
        noValidate
        className="mb-5 flex flex-wrap items-end gap-3 rounded-3xl border border-hairline bg-white p-4"
      >
        <TextField
          tone="light"
          name="name"
          label={t.newName}
          required
          maxLength={120}
          error={error.name}
          wrapperClassName="min-w-48 flex-1"
          className="text-[16px]"
        />
        <TextField
          tone="light"
          name="price"
          label={t.newPrice}
          required
          inputMode="numeric"
          error={error.price}
          wrapperClassName="w-36"
          className="text-[16px]"
        />
        <Button type="submit" variant="deep" size="sm" className="min-h-11 gap-1.5 px-5">
          <FiPlus aria-hidden="true" />
          <BusyLabel busy={busy} idle={t.add} sending={t.adding} />
        </Button>
      </form>
      {items.length === 0 ? (
        <p className="rounded-3xl border border-hairline bg-white px-5 py-12 text-center text-[15px] text-charcoal/60">
          {t.empty}
        </p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-hairline bg-white">
          <div className="hidden grid-cols-[minmax(0,1fr)_9rem_auto] gap-2 border-b border-hairline px-6 py-2 text-[12.5px] font-semibold uppercase tracking-wide text-charcoal/60 sm:grid">
            <span>{t.name}</span>
            <span className="text-right">{t.price}</span>
            <span className="text-right">{t.active}</span>
          </div>
          <ul className="divide-y divide-hairline">
            {items.map((item) => (
              <PriceRow key={`${item.id}-${item.revision}`} item={item} />
            ))}
          </ul>
          <p className="border-t border-hairline px-6 py-2 text-[12.5px] text-charcoal/55">
            {t.count(items.filter((item) => item.active).length, items.length)}
          </p>
        </div>
      )}
    </SalesShell>
  );
}
