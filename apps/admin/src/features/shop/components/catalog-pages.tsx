"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FiPlus } from "react-icons/fi";

import { toSlug } from "@lavieco/shared";
import type { PartnerBrand, ProductCategory, ShopSettings } from "@lavieco/shared/shop";
import { Button, CheckboxField, TextField, TextareaField, cn, useToast } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { createCategory, saveBrand, saveShopSettings, updateCategory } from "../actions/shop";
import { TEXT } from "../constants/text";
import { FreeWardsField } from "./free-wards-field";
import { failureText } from "../utils/failure";
import { ShopShell } from "./shop-shell";

const t = TEXT.vi;
const toInt = (text: string) => Number(text.replace(/[.\s]/g, "") || "0");

// ------------------------------------------------------------------ categories

function CategoryRow({ category }: { category: ProductCategory }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description);
  const [busy, setBusy] = useState(false);

  const save = async (archived: boolean) => {
    setBusy(true);
    const result = await callAction(() =>
      updateCategory(category.id, {
        name,
        description,
        sortOrder: category.sortOrder,
        archived,
        revision: category.revision,
      }),
    );
    setBusy(false);
    if (result.status === "ok") {
      toast({ tone: "success", message: t.categories.saved });
      router.refresh();
    } else toast({ tone: "error", message: failureText(result) });
  };

  return (
    <li
      className={cn(
        "grid gap-3 border-b border-hairline p-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]",
        category.archived && "bg-soft-white",
      )}
    >
      <TextField
        tone="light"
        label={t.categories.name}
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        tone="light"
        label={t.categories.description}
        value={description}
        disabled={busy}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="deep"
          size="sm"
          disabled={busy}
          onClick={() => save(category.archived)}
        >
          {t.categories.save}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => save(!category.archived)}
        >
          {category.archived ? t.categories.restore : t.categories.archive}
        </Button>
      </div>
      {category.archived ? (
        <p className="text-[12px] font-semibold text-charcoal/60 md:col-span-3">
          {t.categories.archived}
        </p>
      ) : null}
    </li>
  );
}

/** `/shop/categories`: rename, reorder by position, archive instead of delete. */
export function CategoriesPage({ categories }: { categories: ProductCategory[] }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const result = await callAction(() => createCategory({ name, description: "" }));
    setBusy(false);
    if (result.status === "ok") {
      setName("");
      toast({ tone: "success", message: t.categories.saved });
      router.refresh();
    } else toast({ tone: "error", message: failureText(result) });
  };

  return (
    <ShopShell section="categories" title={t.categories.title} intro={t.categories.intro}>
      <form
        onSubmit={add}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-3xl border border-hairline bg-white p-5"
      >
        <TextField
          tone="light"
          label={t.categories.name}
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
          wrapperClassName="min-w-0 flex-1"
        />
        <Button type="submit" size="sm" disabled={busy}>
          <FiPlus aria-hidden="true" size={14} />
          {t.categories.add}
        </Button>
      </form>
      <section className="overflow-hidden rounded-3xl border border-hairline bg-white">
        {categories.length === 0 ? (
          <p className="px-5 py-12 text-center text-[14px] text-charcoal/60">
            {t.categories.empty}
          </p>
        ) : (
          <ul>
            {categories.map((category) => (
              <CategoryRow key={`${category.id}-${category.revision}`} category={category} />
            ))}
          </ul>
        )}
      </section>
    </ShopShell>
  );
}

// ------------------------------------------------------------------ brands

type BrandValues = {
  name: string;
  slug: string;
  story: string;
  website: string;
  commission: string;
  active: boolean;
};

const brandValues = (brand: PartnerBrand | null): BrandValues => ({
  name: brand?.name ?? "",
  slug: brand?.slug ?? "",
  story: brand?.story ?? "",
  website: brand?.website ?? "",
  commission: brand ? String(brand.commissionRate / 10) : "",
  active: brand?.active ?? true,
});

function BrandForm({ brand, onDone }: { brand: PartnerBrand | null; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(() => brandValues(brand));
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<BrandValues>) => setValues((v) => ({ ...v, ...patch }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await callAction(() =>
      saveBrand(brand?.id ?? null, {
        name: values.name,
        slug: values.slug || toSlug(values.name),
        story: values.story,
        website: values.website,
        // Stored in per mille: 12.5 % → 125.
        commissionRate: Math.round(Number(values.commission.replace(",", ".") || "0") * 10),
        active: values.active,
        ...(brand ? { revision: brand.revision } : {}),
      }),
    );
    setBusy(false);
    if (result.status === "ok") {
      toast({ tone: "success", message: t.brands.saved });
      onDone();
      router.refresh();
    } else toast({ tone: "error", message: failureText(result) });
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-3xl border border-hairline bg-white p-5 md:grid-cols-2"
    >
      <TextField
        tone="light"
        required
        label={t.brands.name}
        value={values.name}
        disabled={busy}
        onChange={(e) =>
          set({ name: e.target.value, ...(brand ? {} : { slug: toSlug(e.target.value) }) })
        }
      />
      <TextField
        tone="light"
        required
        label={t.brands.slug}
        value={values.slug}
        disabled={busy}
        onChange={(e) => set({ slug: e.target.value })}
      />
      <TextField
        tone="light"
        label={t.brands.website}
        value={values.website}
        disabled={busy}
        onChange={(e) => set({ website: e.target.value })}
      />
      <TextField
        tone="light"
        required
        label={t.brands.commission}
        inputMode="decimal"
        value={values.commission}
        disabled={busy}
        onChange={(e) => set({ commission: e.target.value })}
      />
      <TextareaField
        tone="light"
        label={t.brands.story}
        rows={3}
        value={values.story}
        disabled={busy}
        onChange={(e) => set({ story: e.target.value })}
        wrapperClassName="md:col-span-2"
      />
      <CheckboxField
        tone="light"
        label={t.brands.active}
        checked={values.active}
        disabled={busy}
        onChange={(e) => set({ active: e.target.checked })}
      />
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={onDone}>
          {t.brands.cancel}
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          {t.brands.save}
        </Button>
      </div>
    </form>
  );
}

/** `/shop/brands`: partner brands (Lớp Truyền thông) and their commission (BR-25). */
export function BrandsPage({ brands }: { brands: PartnerBrand[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <ShopShell
      section="brands"
      title={t.brands.title}
      intro={t.brands.intro}
      actions={
        <Button type="button" size="sm" onClick={() => setEditing("new")}>
          <FiPlus aria-hidden="true" size={14} />
          {t.brands.add}
        </Button>
      }
    >
      {editing === "new" ? (
        <div className="mb-6">
          <BrandForm brand={null} onDone={() => setEditing(null)} />
        </div>
      ) : null}
      {brands.length === 0 && editing !== "new" ? (
        <p className="rounded-3xl border border-hairline bg-white px-5 py-12 text-center text-[14px] text-charcoal/60">
          {t.brands.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {brands.map((brand) =>
            editing === brand.id ? (
              <li key={brand.id}>
                <BrandForm brand={brand} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li
                key={brand.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-hairline bg-white p-5"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg text-deep-blue">{brand.name}</p>
                  <p className="text-[13px] text-charcoal/70">
                    {t.brands.commission}: {brand.commissionRate / 10}% ·{" "}
                    {brand.active ? t.brands.active : t.brands.inactive}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditing(brand.id)}
                >
                  {t.brands.edit}
                </Button>
              </li>
            ),
          )}
        </ul>
      )}
    </ShopShell>
  );
}

// ------------------------------------------------------------------ settings

/** `/shop/settings`: delivery fee, pickup, COD limit, hold time, returns (docs/08). */
export function ShopSettingsPage({ settings }: { settings: ShopSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({
    shippingFee: String(settings.shippingFee),
    freeFrom: settings.freeShippingFrom === null ? "" : String(settings.freeShippingFrom),
    freeWards: settings.freeShippingWardCodes,
    pickupEnabled: settings.pickup.enabled,
    pickupAddress: settings.pickup.address,
    pickupNote: settings.pickup.note,
    codEnabled: settings.cod.enabled,
    codMax: String(settings.cod.maxAmount),
    hold: String(settings.holdMinutes),
    returns: String(settings.returnDays),
  });
  const set = (patch: Partial<typeof v>) => setV((current) => ({ ...current, ...patch }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await callAction(() =>
      saveShopSettings({
        shippingFee: toInt(v.shippingFee),
        freeShippingFrom: v.freeFrom.trim() ? toInt(v.freeFrom) : null,
        freeShippingWardCodes: v.freeWards,
        pickup: { enabled: v.pickupEnabled, address: v.pickupAddress, note: v.pickupNote },
        cod: { enabled: v.codEnabled, maxAmount: toInt(v.codMax) },
        holdMinutes: toInt(v.hold),
        returnDays: toInt(v.returns),
        revision: settings.revision,
      }),
    );
    setBusy(false);
    if (result.status === "ok") {
      toast({ tone: "success", message: t.settings.saved });
      router.refresh();
    } else toast({ tone: "error", message: failureText(result) });
  };

  const group = "space-y-4 rounded-3xl border border-hairline bg-white p-5";
  return (
    <ShopShell section="settings" title={t.settings.title} intro={t.settings.intro}>
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
        <fieldset className={group}>
          <legend className="font-display text-lg text-deep-blue">{t.settings.shipping}</legend>
          <TextField
            tone="light"
            label={t.settings.shippingFee}
            inputMode="numeric"
            value={v.shippingFee}
            disabled={busy}
            onChange={(e) => set({ shippingFee: e.target.value })}
          />
          <TextField
            tone="light"
            label={t.settings.freeFrom}
            inputMode="numeric"
            value={v.freeFrom}
            disabled={busy}
            onChange={(e) => set({ freeFrom: e.target.value })}
          />
          <FreeWardsField
            value={v.freeWards}
            disabled={busy}
            onChange={(freeWards) => set({ freeWards })}
          />
          <CheckboxField
            tone="light"
            label={t.settings.pickup}
            checked={v.pickupEnabled}
            disabled={busy}
            onChange={(e) => set({ pickupEnabled: e.target.checked })}
          />
          {v.pickupEnabled ? (
            <>
              <TextField
                tone="light"
                label={t.settings.pickupAddress}
                value={v.pickupAddress}
                disabled={busy}
                onChange={(e) => set({ pickupAddress: e.target.value })}
              />
              <TextField
                tone="light"
                label={t.settings.pickupNote}
                value={v.pickupNote}
                disabled={busy}
                onChange={(e) => set({ pickupNote: e.target.value })}
              />
            </>
          ) : null}
        </fieldset>
        <fieldset className={group}>
          <legend className="font-display text-lg text-deep-blue">{t.settings.payment}</legend>
          <CheckboxField
            tone="light"
            label={t.settings.codEnabled}
            checked={v.codEnabled}
            disabled={busy}
            onChange={(e) => set({ codEnabled: e.target.checked })}
          />
          {v.codEnabled ? (
            <TextField
              tone="light"
              label={t.settings.codMax}
              inputMode="numeric"
              value={v.codMax}
              disabled={busy}
              onChange={(e) => set({ codMax: e.target.value })}
            />
          ) : null}
        </fieldset>
        <fieldset className={group}>
          <legend className="font-display text-lg text-deep-blue">{t.settings.policy}</legend>
          <TextField
            tone="light"
            label={t.settings.hold}
            inputMode="numeric"
            value={v.hold}
            disabled={busy}
            onChange={(e) => set({ hold: e.target.value })}
          />
          <TextField
            tone="light"
            label={t.settings.returns}
            inputMode="numeric"
            value={v.returns}
            disabled={busy}
            onChange={(e) => set({ returns: e.target.value })}
          />
        </fieldset>
        <div className="flex items-end justify-end lg:col-span-2">
          <Button type="submit" disabled={busy}>
            {t.settings.save}
          </Button>
        </div>
      </form>
    </ShopShell>
  );
}
