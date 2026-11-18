"use client";

import { useState } from "react";
import { FiSearch } from "react-icons/fi";

import {
  HANDBOOK_HOTSPOT_TYPES,
  parseHandbookVideoUrl,
  type HandbookHotspotTarget,
  type HandbookHotspotType,
} from "@lavieco/shared/content";
import { SelectField, TextField } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { searchProducts, type ProductChoice } from "../actions/handbook";
import { TEXT } from "../constants/text";

const t = TEXT.vi.inspector;

export type PageChoice = { id: string; label: string };

/** A fresh target when the editor switches the type. */
export function emptyTarget(type: HandbookHotspotType, firstPageId: string): HandbookHotspotTarget {
  switch (type) {
    case "product":
      return { type, productId: "", slug: "", title: "" };
    case "page":
      return { type, pageId: firstPageId };
    case "video":
      return { type, url: "" };
    case "url":
      return { type, url: "" };
    case "laviagent":
      return { type, prompt: "" };
  }
}

/** Whether the target is complete enough to save (the service validates again). */
export function targetIsValid(target: HandbookHotspotTarget): boolean {
  switch (target.type) {
    case "product":
      return /^[0-9a-f]{24}$/.test(target.productId);
    case "page":
      return target.pageId.length > 0;
    case "video":
      return parseHandbookVideoUrl(target.url) !== null;
    case "url":
      return /^https:\/\/\S+\.\S+/.test(target.url);
    case "laviagent":
      return true;
  }
}

function ProductPicker({
  target,
  onChange,
}: {
  target: Extract<HandbookHotspotTarget, { type: "product" }>;
  onChange: (target: HandbookHotspotTarget) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductChoice[] | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setBusy(true);
    const result = await callAction(() => searchProducts(query));
    setBusy(false);
    setResults(result.status === "ok" ? result.data : []);
  };

  return (
    <div className="space-y-2">
      {target.title ? (
        <p className="text-[13px] font-semibold text-emerald-ink">
          {t.productChosen(target.title)}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <TextField
          tone="light"
          label={t.productSearch}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
          wrapperClassName="flex-1"
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={busy}
          aria-label={t.productSearch}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-hairline bg-white text-deep-blue hover:bg-mint-mist"
        >
          <FiSearch aria-hidden="true" size={18} />
        </button>
      </div>
      {results ? (
        results.length === 0 ? (
          <p className="text-[13px] text-charcoal/70">{t.productNone}</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {results.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      type: "product",
                      productId: product.id,
                      slug: product.slug,
                      title: product.title,
                    })
                  }
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-[13.5px] text-deep-blue hover:bg-mint-mist"
                >
                  <span className="truncate">{product.title}</span>
                  <span className="text-[12px] font-semibold text-emerald-ink">
                    {t.productPick}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

/** Type and destination of one hotspot. */
export function HotspotTargetFields({
  target,
  pages,
  disabled,
  onChange,
}: {
  target: HandbookHotspotTarget;
  pages: PageChoice[];
  disabled: boolean;
  onChange: (target: HandbookHotspotTarget) => void;
}) {
  const video =
    target.type === "video" && target.url.length > 0 && !parseHandbookVideoUrl(target.url);
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <SelectField
        tone="light"
        label={t.type}
        value={target.type}
        options={HANDBOOK_HOTSPOT_TYPES.map((type) => ({ value: type, label: t.types[type] }))}
        onChange={(event) =>
          onChange(emptyTarget(event.target.value as HandbookHotspotType, pages[0]?.id ?? ""))
        }
      />
      {target.type === "product" ? <ProductPicker target={target} onChange={onChange} /> : null}
      {target.type === "page" ? (
        <SelectField
          tone="light"
          label={t.targetPage}
          value={target.pageId}
          options={pages.map((page) => ({ value: page.id, label: page.label }))}
          onChange={(event) => onChange({ type: "page", pageId: event.target.value })}
        />
      ) : null}
      {target.type === "video" ? (
        <TextField
          tone="light"
          type="url"
          inputMode="url"
          label={t.videoUrl}
          hint={t.videoHint}
          value={target.url}
          error={video ? t.videoHint : undefined}
          onChange={(event) => onChange({ type: "video", url: event.target.value.trim() })}
        />
      ) : null}
      {target.type === "url" ? (
        <TextField
          tone="light"
          type="url"
          inputMode="url"
          label={t.url}
          value={target.url}
          onChange={(event) => onChange({ type: "url", url: event.target.value.trim() })}
        />
      ) : null}
      {target.type === "laviagent" ? (
        <TextField
          tone="light"
          label={t.prompt}
          value={target.prompt}
          maxLength={200}
          onChange={(event) => onChange({ type: "laviagent", prompt: event.target.value })}
        />
      ) : null}
    </fieldset>
  );
}
