"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiPackage } from "react-icons/fi";

import type { ProductVariant } from "@lavieco/shared/shop";
import { Button, SelectField, TextField, useToast } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { adjustStock } from "../actions/shop";
import { TEXT } from "../constants/text";
import { failureText } from "../utils/failure";

const t = TEXT.vi.stock;
const tv = TEXT.vi.editor.variants;

/**
 * Stock of a saved variant: what is on hand, what pending orders hold, and a small
 * panel to receive, remove or count (never below what is held, BR-22). Not part of the
 * product form: it saves on its own and leaves the ledger a line.
 */
export function StockAdjust({ variant, disabled }: { variant: ProductVariant; disabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "set">("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const value = Number(quantity.replace(/[.\s]/g, ""));
    if (quantity.trim() === "" || !Number.isInteger(value)) return;
    setBusy(true);
    const result = await callAction(() =>
      adjustStock(variant.id, { mode, quantity: value, reason }),
    );
    setBusy(false);
    if (result.status === "ok") {
      toast({ tone: "success", message: t.done });
      setOpen(false);
      setQuantity("");
      setReason("");
      router.refresh();
    } else toast({ tone: "error", message: failureText(result) });
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-deep-blue">
          <FiPackage aria-hidden="true" size={14} />
          {tv.stock}: {variant.stock.available}
        </span>
        {variant.stock.held > 0 ? (
          <span className="text-charcoal/70">{tv.held(variant.stock.held)}</span>
        ) : null}
        <button
          type="button"
          aria-expanded={open}
          disabled={disabled || busy}
          onClick={() => setOpen((v) => !v)}
          className="min-h-11 rounded-full px-3 font-semibold text-emerald-ink hover:bg-mint-mist"
        >
          {tv.adjust}
        </button>
      </div>
      {open ? (
        <div className="mt-2 grid gap-3 rounded-2xl bg-soft-white p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1.3fr)_auto]">
          <SelectField
            tone="light"
            label={t.mode}
            value={mode}
            disabled={busy}
            onChange={(event) => setMode(event.target.value === "set" ? "set" : "add")}
            options={[
              { value: "add", label: t.add },
              { value: "set", label: t.set },
            ]}
          />
          <TextField
            tone="light"
            label={t.quantity}
            inputMode="numeric"
            value={quantity}
            disabled={busy}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <TextField
            tone="light"
            label={t.reason}
            value={reason}
            maxLength={300}
            disabled={busy}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="flex items-end gap-2">
            <Button type="button" variant="deep" size="sm" disabled={busy} onClick={submit}>
              {t.submit}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
