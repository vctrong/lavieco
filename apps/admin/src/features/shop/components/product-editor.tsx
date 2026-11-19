"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { FiArrowLeft, FiCheck, FiCircle, FiPlus, FiTrash2 } from "react-icons/fi";

import { toSlug } from "@lavieco/shared";
import {
  PRODUCT_BADGES,
  SHOP_LIMITS,
  productCreateRequestSchema,
  type PartnerBrand,
  type ProductCategory,
  type ProductStatus,
  type ProductVariant,
  type ProductView,
} from "@lavieco/shared/shop";
import {
  Button,
  CheckboxField,
  DraftOfferBanner,
  DraftStatusLine,
  FormAlert,
  SelectField,
  TextField,
  TextareaField,
  choiceControlClass,
  cn,
  focusField,
  useToast,
} from "@lavieco/ui";

import { callAction } from "@/shared/call-action";
import { FORM_TEXT } from "@/shared/constants/form-text";
import { useStaffDraft } from "@/shared/drafts";

import {
  approveProductImpact,
  createProduct,
  setProductStatus,
  updateProduct,
} from "../actions/shop";
import { TEXT } from "../constants/text";
import {
  emptyProductValues,
  emptyVariant,
  fieldId,
  generateVariants,
  productToValues,
  toOptions,
  toProductRequest,
  type ProductFormValues,
  type VariantValues,
} from "../utils/product-values";
import { failureText } from "../utils/failure";
import { ImageManager } from "./image-manager";
import { StatusBadge } from "./status-badge";
import { StockAdjust } from "./stock-adjust";

const t = TEXT.vi.editor;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-5 rounded-3xl border border-hairline bg-white p-5 md:p-6"
    >
      <h2 id={id} className="font-display text-xl text-deep-blue">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Zod issue path → the key used for `errors` and the field's DOM id. */
const pathKey = (path: readonly PropertyKey[]) => {
  const [head, ...rest] = path.map(String);
  const rename: Record<string, string> = {
    handbookLink: "handbookSlug",
    story: rest[0] ?? "story",
    seo: rest[0] === "title" ? "seoTitle" : "seoDescription",
  };
  if (head && head in rename) return rename[head]!;
  return [head, ...rest].join(".");
};

/**
 * `/shop/products/new` and `/shop/products/[id]` (UC-38). One form for the whole product;
 * images, variants and the story card save together. Publishing is a separate action,
 * allowed once the checklist (BR-20) is complete. Kept as a draft in this browser until
 * the server accepts it.
 */
export function ProductEditor({
  product,
  categories,
  brands,
}: {
  product: ProductView | null;
  categories: ProductCategory[];
  brands: PartnerBrand[];
}) {
  const router = useRouter();
  const toast = useToast();
  const activeCategories = categories.filter((c) => !c.archived || c.id === product?.categoryId);
  const [values, setValues] = useState<ProductFormValues>(() =>
    product ? productToValues(product) : emptyProductValues(activeCategories[0]?.id ?? ""),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const draft = useStaffDraft<ProductFormValues>({
    form: "product",
    record: product?.id ?? "new",
    values,
    dirty,
    revision: product?.revision ?? null,
    onRestore: useCallback((restored: ProductFormValues) => {
      setValues(restored);
      setDirty(true);
    }, []),
  });

  const update = (patch: Partial<ProductFormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const field = (key: keyof ProductFormValues & string) => ({
    id: fieldId(key),
    name: key,
    value: String(values[key]),
    error: errors[key],
    disabled: busy,
    onChange: (event: { target: { value: string } }) =>
      update({ [key]: event.target.value } as Partial<ProductFormValues>),
  });

  const options = toOptions(values.options);
  const optionLabel = (variant: VariantValues) =>
    options
      .map((o) => o.values.find((v) => v.key === variant.optionValues[o.key])?.label ?? "?")
      .join(" · ") || t.variants.default;
  const variantChoices = options.flatMap((o) =>
    o.values.map((v) => ({ value: `${o.key}:${v.key}`, label: `${o.name}: ${v.label}` })),
  );
  const stockById = new Map<string, ProductVariant>(product?.variants.map((v) => [v.id, v]) ?? []);

  const setVariant = (index: number, patch: Partial<VariantValues>) =>
    update({ variants: values.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)) });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAlert(null);
    const body = toProductRequest(values);
    const checked = productCreateRequestSchema.safeParse(body);
    if (!checked.success) {
      const next: Record<string, string> = {};
      for (const issue of checked.error.issues)
        next[pathKey(issue.path)] ??= TEXT.vi.errors.invalid;
      setErrors(next);
      setAlert(TEXT.vi.errors.invalid);
      const first = Object.keys(next)[0];
      if (first) focusField(fieldId(first));
      return;
    }
    setErrors({});
    setBusy(true);
    const result = await callAction(() =>
      product
        ? updateProduct(product.id, { ...checked.data, revision: product.revision })
        : createProduct(checked.data),
    );
    setBusy(false);
    if (result.status === "ok") {
      setDirty(false);
      draft.clear();
      toast({ tone: "success", message: product ? t.saved : t.created });
      if (product) router.refresh();
      else router.push(`/shop/products/${result.data.id}`);
      return;
    }
    if (result.status === "invalid") setErrors(result.fieldErrors);
    setAlert(failureText(result));
  };

  const changeStatus = async (status: ProductStatus) => {
    if (!product) return;
    if (dirty) {
      toast({ tone: "info", message: t.publish.saveFirst });
      return;
    }
    setBusy(true);
    const result = await callAction(() =>
      setProductStatus(product.id, { status, revision: product.revision }),
    );
    setBusy(false);
    if (result.status === "ok") {
      toast({
        tone: "success",
        message: status === "published" ? t.publish.published : t.publish.changed,
      });
      router.refresh();
    } else toast({ tone: "error", message: failureText(result) });
  };

  const approveImpact = async () => {
    if (!product) return;
    setBusy(true);
    const result = await callAction(() => approveProductImpact(product.id, product.revision));
    setBusy(false);
    if (result.status === "ok") {
      toast({ tone: "success", message: t.impact.approved });
      router.refresh();
    } else toast({ tone: "error", message: failureText(result) });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/shop/products"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-[13px] text-deep-blue hover:text-emerald-ink"
      >
        <FiArrowLeft aria-hidden="true" size={14} />
        {t.back}
      </Link>
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl text-deep-blue md:text-4xl">
          {product ? product.title : t.newTitle}
        </h1>
        {product ? <StatusBadge status={product.status} /> : null}
      </header>

      <form
        onSubmit={submit}
        noValidate
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="space-y-6">
          <DraftOfferBanner
            offer={draft.offer}
            text={FORM_TEXT.vi.draft}
            onRestore={draft.restore}
            onDiscard={draft.discard}
          />
          <FormAlert tone="error" message={alert} />

          <Section id="sec-info" title={t.sections.info}>
            <TextField
              tone="light"
              required
              label={t.fields.title}
              maxLength={SHOP_LIMITS.titleMax}
              {...field("title")}
              onChange={(event) => {
                const title = event.target.value;
                update(values.slugTouched ? { title } : { title, slug: toSlug(title) });
              }}
            />
            <TextField
              tone="light"
              required
              label={t.fields.slug}
              hint={t.fields.slugHint}
              {...field("slug")}
              onChange={(event) => update({ slug: event.target.value, slugTouched: true })}
            />
            <TextareaField tone="light" label={t.fields.summary} rows={2} {...field("summary")} />
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                tone="light"
                required
                label={t.fields.category}
                {...field("categoryId")}
                options={activeCategories.map((c) => ({ value: c.id, label: c.name }))}
              />
              <SelectField
                tone="light"
                label={t.fields.brand}
                {...field("partnerBrandId")}
                options={[
                  { value: "", label: t.fields.brandNone },
                  ...brands.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextareaField
                tone="light"
                label={t.fields.materials}
                hint={t.fields.materialsHint}
                rows={3}
                {...field("materialsText")}
              />
              <TextareaField tone="light" label={t.fields.care} rows={3} {...field("care")} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField tone="light" label={t.fields.dimensions} {...field("dimensions")} />
              {values.variants.some((variant) => variant.madeToOrder) ? (
                <TextField
                  tone="light"
                  inputMode="numeric"
                  label={t.fields.leadTimeDays}
                  hint={t.fields.leadTimeHint}
                  {...field("leadTimeDays")}
                />
              ) : null}
              <TextField
                tone="light"
                label={t.fields.sortOrder}
                inputMode="numeric"
                {...field("sortOrder")}
              />
            </div>
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold text-deep-blue">
                {t.fields.badges}
              </legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {PRODUCT_BADGES.map((badge) => (
                  <CheckboxField
                    key={badge}
                    tone="light"
                    label={t.badges[badge]}
                    checked={values.badges.includes(badge)}
                    disabled={busy}
                    onChange={(event) =>
                      update({
                        badges: event.target.checked
                          ? [...values.badges, badge]
                          : values.badges.filter((b) => b !== badge),
                      })
                    }
                  />
                ))}
              </div>
            </fieldset>
          </Section>

          <Section id="sec-images" title={t.sections.images}>
            <ImageManager
              images={values.images}
              onChange={(images) => update({ images })}
              variantChoices={variantChoices}
              disabled={busy}
            />
          </Section>

          <Section id="sec-variants" title={t.sections.variants}>
            <div className="space-y-3 rounded-2xl bg-soft-white p-4">
              <p className="text-[13.5px] font-semibold text-deep-blue">{t.options.title}</p>
              <p className="text-[12.5px] text-charcoal/70">{t.options.hint}</p>
              {values.options.map((option, index) => (
                <div
                  key={index}
                  className="grid gap-3 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]"
                >
                  <TextField
                    tone="light"
                    label={t.options.name}
                    value={option.name}
                    disabled={busy}
                    onChange={(event) =>
                      update({
                        options: values.options.map((o, i) =>
                          i === index ? { ...o, name: event.target.value } : o,
                        ),
                      })
                    }
                  />
                  <TextField
                    tone="light"
                    label={t.options.values}
                    value={option.valuesText}
                    disabled={busy}
                    onChange={(event) =>
                      update({
                        options: values.options.map((o, i) =>
                          i === index ? { ...o, valuesText: event.target.value } : o,
                        ),
                      })
                    }
                  />
                  <div className="flex items-end">
                    <button
                      type="button"
                      aria-label={t.options.remove}
                      disabled={busy}
                      onClick={() =>
                        update({ options: values.options.filter((_, i) => i !== index) })
                      }
                      className="grid size-11 place-items-center rounded-full text-error hover:bg-error/5"
                    >
                      <FiTrash2 aria-hidden="true" size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {values.options.length < SHOP_LIMITS.optionsMax ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      update({ options: [...values.options, { name: "", valuesText: "" }] })
                    }
                  >
                    <FiPlus aria-hidden="true" size={14} />
                    {t.options.add}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="deep"
                  size="sm"
                  disabled={busy}
                  onClick={() => update({ variants: generateVariants(options, values.variants) })}
                >
                  {t.options.generate}
                </Button>
              </div>
            </div>

            <ul className="space-y-4">
              {values.variants.map((variant, index) => {
                const saved = variant.id ? stockById.get(variant.id) : undefined;
                const path = (key: string) => `variants.${index}.${key}`;
                return (
                  <li
                    key={variant.id ?? `new-${index}`}
                    className="space-y-3 rounded-2xl border border-hairline p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-deep-blue">{optionLabel(variant)}</p>
                      <label className="flex min-h-11 items-center gap-2 text-[13px]">
                        <input
                          type="checkbox"
                          className={choiceControlClass("light")}
                          checked={variant.active}
                          disabled={busy}
                          onChange={(event) => setVariant(index, { active: event.target.checked })}
                        />
                        {t.variants.active}
                      </label>
                      <label className="flex min-h-11 items-center gap-2 text-[13px]">
                        <input
                          type="checkbox"
                          className={choiceControlClass("light")}
                          checked={variant.madeToOrder}
                          disabled={busy}
                          onChange={(event) =>
                            setVariant(index, { madeToOrder: event.target.checked })
                          }
                        />
                        {t.variants.madeToOrder}
                      </label>
                    </div>
                    {variant.madeToOrder ? (
                      <p className="text-[13px] text-charcoal/70">{t.variants.madeToOrderNote}</p>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                      <TextField
                        tone="light"
                        required
                        id={fieldId(path("sku"))}
                        label={t.variants.sku}
                        value={variant.sku}
                        error={errors[path("sku")]}
                        disabled={busy}
                        onChange={(event) => setVariant(index, { sku: event.target.value })}
                      />
                      <TextField
                        tone="light"
                        required
                        inputMode="numeric"
                        id={fieldId(path("price"))}
                        label={t.variants.price}
                        value={variant.price}
                        error={errors[path("price")]}
                        disabled={busy}
                        onChange={(event) => setVariant(index, { price: event.target.value })}
                      />
                      <TextField
                        tone="light"
                        inputMode="numeric"
                        id={fieldId(path("compareAtPrice"))}
                        label={t.variants.compareAt}
                        value={variant.compareAtPrice}
                        error={errors[path("compareAtPrice")]}
                        disabled={busy}
                        onChange={(event) =>
                          setVariant(index, { compareAtPrice: event.target.value })
                        }
                      />
                      {variant.madeToOrder ? null : variant.id ? (
                        <TextField
                          tone="light"
                          inputMode="numeric"
                          label={t.variants.threshold}
                          value={variant.lowStockThreshold}
                          disabled={busy}
                          onChange={(event) =>
                            setVariant(index, { lowStockThreshold: event.target.value })
                          }
                        />
                      ) : (
                        <TextField
                          tone="light"
                          inputMode="numeric"
                          label={t.variants.initialStock}
                          value={variant.initialStock}
                          disabled={busy}
                          onChange={(event) =>
                            setVariant(index, { initialStock: event.target.value })
                          }
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {saved && !variant.madeToOrder ? (
                        <StockAdjust variant={saved} disabled={busy} />
                      ) : (
                        <span />
                      )}
                      {values.variants.length > 1 ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            update({ variants: values.variants.filter((_, i) => i !== index) })
                          }
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-error hover:bg-error/5"
                        >
                          <FiTrash2 aria-hidden="true" size={14} />
                          {t.variants.remove}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {options.length === 0 ? null : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => update({ variants: [...values.variants, emptyVariant()] })}
              >
                <FiPlus aria-hidden="true" size={14} />
                {t.variants.add}
              </Button>
            )}
          </Section>

          <Section id="sec-story" title={t.sections.story}>
            <p className="rounded-2xl bg-mint-mist px-4 py-3 text-[13px] text-deep-blue">
              {t.storyHint}
            </p>
            <TextareaField
              tone="light"
              required
              label={t.fields.message}
              rows={2}
              {...field("message")}
            />
            <TextareaField
              tone="light"
              required
              label={t.fields.story}
              rows={5}
              {...field("story")}
            />
            <TextareaField
              tone="light"
              required
              label={t.fields.lesson}
              rows={3}
              {...field("lesson")}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                tone="light"
                required
                label={t.fields.handbookSlug}
                {...field("handbookSlug")}
              />
              <TextField
                tone="light"
                required
                label={t.fields.handbookTitle}
                {...field("handbookTitle")}
              />
            </div>
          </Section>

          <Section id="sec-impact" title={t.sections.impact}>
            <p className="text-[13px] text-charcoal/75">{t.impact.hint}</p>
            {values.impactItems.map((item, index) => {
              const set = (patch: Partial<typeof item>) =>
                update({
                  impactItems: values.impactItems.map((it, i) =>
                    i === index ? { ...it, ...patch } : it,
                  ),
                });
              return (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl border border-hairline p-4 md:grid-cols-4"
                >
                  <TextField
                    tone="light"
                    label={t.impact.label}
                    value={item.label}
                    disabled={busy}
                    onChange={(e) => set({ label: e.target.value })}
                  />
                  <TextField
                    tone="light"
                    label={t.impact.value}
                    value={item.value}
                    disabled={busy}
                    onChange={(e) => set({ value: e.target.value })}
                  />
                  <TextField
                    tone="light"
                    label={t.impact.unit}
                    value={item.unit}
                    disabled={busy}
                    onChange={(e) => set({ unit: e.target.value })}
                  />
                  <TextField
                    tone="light"
                    label={t.impact.source}
                    value={item.source}
                    disabled={busy}
                    onChange={(e) => set({ source: e.target.value })}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      update({ impactItems: values.impactItems.filter((_, i) => i !== index) })
                    }
                    className="inline-flex min-h-11 items-center gap-1.5 justify-self-start rounded-full px-3 text-[12.5px] font-semibold text-error hover:bg-error/5"
                  >
                    <FiTrash2 aria-hidden="true" size={14} />
                    {t.impact.remove}
                  </button>
                </div>
              );
            })}
            {values.impactItems.length < SHOP_LIMITS.impactItemsMax ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() =>
                  update({
                    impactItems: [
                      ...values.impactItems,
                      { label: "", value: "", unit: "", source: "" },
                    ],
                  })
                }
              >
                <FiPlus aria-hidden="true" size={14} />
                {t.impact.add}
              </Button>
            ) : null}
          </Section>

          <Section id="sec-seo" title={t.sections.seo}>
            <TextField
              tone="light"
              label={t.fields.seoTitle}
              maxLength={SHOP_LIMITS.seoTitleMax}
              {...field("seoTitle")}
            />
            <TextareaField
              tone="light"
              label={t.fields.seoDescription}
              rows={2}
              maxLength={SHOP_LIMITS.seoDescriptionMax}
              {...field("seoDescription")}
            />
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="space-y-3 rounded-3xl border border-hairline bg-white p-5">
            <Button type="submit" className="w-full justify-center" disabled={busy}>
              {busy ? t.saving : t.save}
            </Button>
            <DraftStatusLine status={draft.status} text={FORM_TEXT.vi.draft} />
          </div>
          {product ? (
            <div className="space-y-4 rounded-3xl border border-hairline bg-white p-5">
              <h2 className="font-display text-lg text-deep-blue">{t.publish.title}</h2>
              <div>
                <p className="mb-2 text-[12.5px] font-semibold text-charcoal/70">
                  {t.publish.checklist}
                </p>
                <ul className="space-y-1.5">
                  {(Object.keys(TEXT.vi.blockers) as (keyof typeof TEXT.vi.blockers)[]).map(
                    (key) => {
                      const ok = !product.publishBlockers.includes(key);
                      return (
                        <li key={key} className="flex items-start gap-2 text-[13px]">
                          {ok ? (
                            <FiCheck
                              aria-hidden="true"
                              className="mt-0.5 shrink-0 text-emerald-ink"
                            />
                          ) : (
                            <FiCircle
                              aria-hidden="true"
                              className="mt-0.5 shrink-0 text-charcoal/40"
                            />
                          )}
                          <span className={cn(ok ? "text-charcoal" : "text-charcoal/70")}>
                            {TEXT.vi.blockers[key]}
                          </span>
                        </li>
                      );
                    },
                  )}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.status !== "published" ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || product.publishBlockers.length > 0}
                    onClick={() => changeStatus("published")}
                  >
                    {t.publish.publish}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => changeStatus("hidden")}
                  >
                    {t.publish.hide}
                  </Button>
                )}
                {product.status !== "draft" && product.status !== "published" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => changeStatus("draft")}
                  >
                    {t.publish.draft}
                  </Button>
                ) : null}
                {product.status !== "archived" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => changeStatus("archived")}
                  >
                    {t.publish.archive}
                  </Button>
                ) : null}
              </div>
              <div className="border-t border-hairline pt-3 text-[13px]">
                <p className="text-charcoal/75">
                  {t.sections.impact}: {t.impact.status[product.impact.status]}
                </p>
                {product.impact.status === "pending" ? (
                  <Button
                    type="button"
                    variant="deep"
                    size="sm"
                    className="mt-2"
                    disabled={busy}
                    onClick={approveImpact}
                  >
                    {t.impact.approve}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </aside>
      </form>
    </div>
  );
}
