"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiDownload,
  FiFolder,
  FiImage,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

import { checkImageFile } from "@lavieco/shared/media";
import {
  IMPORT_MODES,
  type ImportColumn,
  type ImportJob,
  type ImportMode,
  type ImportRow,
} from "@lavieco/shared/shop";
import { Button, ProductFrame, SelectField, TextField, cn, useToast } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";
import { MediaImage } from "@/shared/components/media-image";

import {
  addImportImages,
  cancelImport,
  commitImport,
  setImportRemovedImages,
  skipImportRow,
  updateImportRow,
} from "../actions/import";
import { TEXT } from "../constants/text";
import type { ShopActionResult, UploadResult } from "../types";
import { failureText } from "../utils/failure";
import { expandFiles, matchFiles } from "../utils/import-files";
import { ShopShell } from "./shop-shell";

const t = TEXT.vi.import;
const CONCURRENCY = 3;
/** Columns offered when fixing a row (the faulty ones are added on top). */
const EDITABLE: ImportColumn[] = [
  "slug",
  "ten_san_pham",
  "danh_muc",
  "sku",
  "tuy_chon_1_gia_tri",
  "gia",
  "gia_khuyen_mai",
  "ton_kho",
  "anh",
  "trang_thai",
];

type Filter = keyof typeof t.filter;
const hasError = (row: ImportRow) => row.issues.some((i) => i.severity === "error");
const inFilter = (row: ImportRow, filter: Filter) => {
  if (filter === "skipped") return row.skipped;
  if (row.skipped) return filter === "all";
  if (filter === "errors") return hasError(row);
  if (filter === "warnings") return !hasError(row) && row.issues.length > 0;
  if (filter === "ok") return row.issues.length === 0;
  return true;
};

function Steps({ current }: { current: number }) {
  return (
    <ol className="mb-6 grid grid-cols-4 gap-2">
      {t.steps.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? "step" : undefined}
          className={cn(
            "rounded-2xl px-3 py-2 text-center text-[12.5px] font-semibold",
            index === current
              ? "bg-deep-blue text-soft-white"
              : index < current
                ? "bg-mint-mist text-emerald-ink"
                : "bg-white text-charcoal/60",
          )}
        >
          {index + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

function RowCard({
  row,
  busy,
  onSave,
  onSkip,
}: {
  row: ImportRow;
  busy: boolean;
  onSave: (raw: Record<string, string>) => Promise<boolean>;
  onSkip: (skipped: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(row.raw);
  const columns = [...new Set([...row.issues.map((i) => i.column), ...EDITABLE])];
  const error = hasError(row);
  return (
    <li
      className={cn(
        "rounded-3xl border bg-white p-4",
        row.skipped ? "border-hairline opacity-60" : error ? "border-error" : "border-hairline",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13.5px]">
          <span className="font-semibold text-deep-blue">
            {t.row} {row.rowNumber}
          </span>{" "}
          · {row.slug || "—"} · <span className="font-mono">{row.raw.sku || "—"}</span>
          {row.action ? (
            <span className="ml-2 text-charcoal/65">({t.action[row.action]})</span>
          ) : null}
        </p>
        <div className="flex gap-1">
          {!row.skipped ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing((v) => !v)}
              className="min-h-11 rounded-full px-3 text-[12.5px] font-semibold text-emerald-ink hover:bg-mint-mist"
            >
              {t.edit}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => onSkip(!row.skipped)}
            className="min-h-11 rounded-full px-3 text-[12.5px] font-semibold text-deep-blue hover:bg-mint-mist"
          >
            {row.skipped ? t.unskip : t.skip}
          </button>
        </div>
      </div>
      {row.issues.length > 0 && !row.skipped ? (
        <ul className="mt-2 space-y-1">
          {row.issues.map((issue) => (
            <li
              key={`${issue.column}-${issue.code}`}
              className={cn(
                "flex items-start gap-1.5 text-[12.5px]",
                issue.severity === "error" ? "text-error" : "text-charcoal/80",
              )}
            >
              {issue.severity === "error" ? (
                <FiAlertCircle aria-hidden="true" className="mt-0.5 shrink-0" />
              ) : (
                <FiAlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" />
              )}
              <span>
                <span className="font-mono">{issue.column}</span>: {t.issues[issue.code]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {editing ? (
        <form
          className="mt-3 grid gap-3 rounded-2xl bg-soft-white p-3 md:grid-cols-2"
          onSubmit={async (event: FormEvent) => {
            event.preventDefault();
            if (await onSave(draft)) setEditing(false);
          }}
        >
          <p className="font-semibold text-deep-blue md:col-span-2">{t.editTitle(row.rowNumber)}</p>
          {columns.map((column) => (
            <TextField
              key={column}
              tone="light"
              label={column}
              value={draft[column] ?? ""}
              error={
                row.issues.find((i) => i.column === column)
                  ? t.issues[row.issues.find((i) => i.column === column)!.code]
                  : undefined
              }
              disabled={busy}
              onChange={(event) => setDraft((d) => ({ ...d, [column]: event.target.value }))}
            />
          ))}
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="deep" size="sm" disabled={busy}>
              {t.saveRow}
            </Button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

/**
 * `/shop/products/import` (UC-39, docs/08 §8.3): choose file → check rows → images →
 * import. Nothing is saved before the last step; the import runs in batches and can be
 * resumed, and products that already exist are updated, never duplicated.
 */
export function ImportWizard() {
  const toast = useToast();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<ImportMode>("upsert");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<File[]>([]);
  const [refused, setRefused] = useState<{ name: string; reason: string }[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const apply = (
    result:
      | ShopActionResult<ImportJob>
      | { status: "error"; reason: "stale_version" | "offline" | "unavailable" },
  ) => {
    if (result.status === "ok") {
      setJob(result.data);
      return true;
    }
    toast({ tone: "error", message: failureText(result) });
    return false;
  };

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    const body = new FormData();
    body.set("file", file);
    body.set("mode", mode);
    try {
      const response = await fetch("/api/shop/import", { method: "POST", body });
      const result = (await response.json().catch(() => null)) as
        | { status: "ok"; job: ImportJob }
        | Exclude<ShopActionResult<never>, { status: "ok" }>
        | null;
      if (result?.status === "ok") {
        setJob(result.job);
        setFilter(result.job.counts.errors > 0 ? "errors" : "all");
        setStep(1);
      } else {
        toast({
          tone: "error",
          message: failureText(result ?? { status: "error", reason: "unavailable" }),
        });
      }
    } catch {
      toast({ tone: "error", message: TEXT.vi.errors.offline });
    } finally {
      setBusy(false);
    }
  };

  const run = async (action: () => Promise<ShopActionResult<ImportJob>>) => {
    setBusy(true);
    const ok = apply(await callAction(action));
    setBusy(false);
    return ok;
  };

  const pick = async (list: FileList | null) => {
    if (!list) return;
    const files = await expandFiles([...list]);
    const ok: File[] = [];
    const bad: { name: string; reason: string }[] = [];
    for (const file of files) {
      const issue = checkImageFile(file, "product_image");
      if (issue) {
        bad.push({
          name: file.name,
          reason: TEXT.vi.images.errors[issue.code].replace(
            "{format}",
            (issue.code === "format_refused" ? issue.format : "HEIC").toUpperCase(),
          ),
        });
      } else ok.push(file);
    }
    setPicked((current) => [...current, ...ok]);
    setRefused((current) => [...current, ...bad]);
  };

  const uploadImages = async () => {
    if (!job) return;
    const { matched } = matchFiles(job, picked);
    setBusy(true);
    setProgress({ done: 0, total: matched.length });
    const uploaded: ImportJob["imageFiles"] = [];
    let next = 0;
    const worker = async () => {
      while (next < matched.length) {
        const file = matched[next++]!;
        const body = new FormData();
        body.set("file", file);
        try {
          const response = await fetch("/api/media/product-images", { method: "POST", body });
          const result = (await response.json().catch(() => null)) as UploadResult | null;
          if (result?.status === "ok") {
            const { id, publicId, width, height } = result.media;
            uploaded.push({ fileName: file.name, mediaId: id, publicId, width, height });
          } else {
            setRefused((current) => [
              ...current,
              {
                name: file.name,
                reason:
                  result?.status === "error"
                    ? TEXT.vi.images.errors[result.reason]
                    : TEXT.vi.images.errors.unavailable,
              },
            ]);
          }
        } catch {
          setRefused((current) => [
            ...current,
            { name: file.name, reason: TEXT.vi.images.errors.unavailable },
          ]);
        }
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, matched.length) }, worker));
    setPicked([]);
    setBusy(false);
    if (uploaded.length > 0) await run(() => addImportImages(job.id, { files: uploaded }));
    setProgress(null);
  };

  const toggleRemoved = (slug: string, mediaIds: string[]) =>
    job ? run(() => setImportRemovedImages(job.id, { slug, mediaIds })) : Promise.resolve(false);

  const commit = async () => {
    if (!job) return;
    setStep(3);
    let current = job;
    // One batch per call (docs/08 §8.3); stops on the first failed call, resumable.
    while (current.status !== "done" && current.status !== "cancelled") {
      setBusy(true);
      const result = await callAction(() => commitImport(current.id));
      setBusy(false);
      if (result.status !== "ok") {
        toast({ tone: "error", message: failureText(result) });
        return;
      }
      current = result.data;
      setJob(current);
    }
  };

  const shell = (children: React.ReactNode) => (
    <ShopShell
      section="products"
      title={t.title}
      intro={t.intro}
      actions={
        <Button as="a" href="/api/shop/import/template" variant="secondary" size="sm">
          <FiDownload aria-hidden="true" size={14} />
          {t.template}
        </Button>
      }
    >
      <Steps current={step} />
      {children}
    </ShopShell>
  );

  if (!job || step === 0) {
    return shell(
      <form
        onSubmit={upload}
        className="space-y-5 rounded-3xl border border-hairline bg-white p-5 md:p-6"
      >
        <SelectField
          tone="light"
          label={t.mode.label}
          value={mode}
          onChange={(event) => setMode(event.target.value as ImportMode)}
          options={IMPORT_MODES.map((value) => ({ value, label: t.mode[value] }))}
        />
        <label className="block">
          <span className="mb-2 block text-[13px] font-semibold text-deep-blue">{t.file}</span>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.csv"
            required
            className="block w-full rounded-2xl border border-hairline bg-soft-white p-3 text-[14px]"
          />
        </label>
        <Button type="submit" disabled={busy}>
          <FiUploadCloud aria-hidden="true" size={16} />
          {busy ? t.reading : t.upload}
        </Button>
      </form>,
    );
  }

  const rows = job.rows.filter((row) => inFilter(row, filter));
  const pendingErrors = job.counts.errors;
  const { matched, unmatched, missing } = matchFiles(job, picked);
  const total = job.rows.filter((r) => !r.skipped).length;
  const finished = job.rows.filter((r) => r.result !== "pending").length;

  return shell(
    <div className="space-y-5">
      <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-hairline bg-white p-4 text-[13.5px]">
        <span className="font-semibold text-deep-blue">{job.fileName}</span>
        <span>{t.summary(job.counts.products, job.counts.rows)}</span>
        <span className={cn(pendingErrors > 0 ? "font-semibold text-error" : "text-charcoal/70")}>
          {t.counts.errors(pendingErrors)}
        </span>
        <span className="text-charcoal/70">{t.counts.warnings(job.counts.warnings)}</span>
        <span className="text-charcoal/70">{t.counts.skipped(job.counts.skipped)}</span>
      </section>

      {step === 1 ? (
        <>
          <div role="tablist" aria-label={t.steps[1]} className="flex flex-wrap gap-2">
            {(Object.keys(t.filter) as Filter[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  "min-h-11 rounded-full px-4 text-[13px]",
                  filter === key
                    ? "bg-deep-blue font-semibold text-soft-white"
                    : "border border-hairline bg-white text-deep-blue",
                )}
              >
                {t.filter[key]}
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="rounded-3xl border border-hairline bg-white p-8 text-center text-[14px] text-charcoal/60">
              {t.noRows}
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.slice(0, 200).map((row) => (
                <RowCard
                  key={`${row.rowNumber}-${JSON.stringify(row.raw)}`}
                  row={row}
                  busy={busy}
                  onSave={(raw) => run(() => updateImportRow(job.id, row.rowNumber, raw))}
                  onSkip={(skipped) =>
                    void run(() => skipImportRow(job.id, row.rowNumber, skipped))
                  }
                />
              ))}
            </ul>
          )}
          <div className="flex flex-wrap justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void run(() => cancelImport(job.id)).then(() => setStep(0))}
            >
              {t.commit.cancel}
            </Button>
            <Button type="button" size="sm" onClick={() => setStep(2)}>
              {t.steps[2]}
            </Button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <section className="space-y-4 rounded-3xl border border-hairline bg-white p-5">
            <h2 className="font-display text-xl text-deep-blue">{t.images.title}</h2>
            <p className="text-[13px] text-charcoal/75">{t.images.hint}</p>
            <input
              ref={imageInput}
              type="file"
              multiple
              accept="image/*,.zip"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => void pick(e.target.files).then(() => (e.target.value = ""))}
            />
            <input
              ref={(node) => {
                folderInput.current = node;
                node?.setAttribute("webkitdirectory", "");
              }}
              type="file"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => void pick(e.target.files).then(() => (e.target.value = ""))}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => imageInput.current?.click()}
              >
                <FiImage aria-hidden="true" size={14} />
                {t.images.pickFiles}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => folderInput.current?.click()}
              >
                <FiFolder aria-hidden="true" size={14} />
                {t.images.pickFolder}
              </Button>
            </div>
            <ul className="space-y-1 text-[13px]">
              <li className="flex items-center gap-1.5 text-emerald-ink">
                <FiCheckCircle aria-hidden="true" />
                {t.images.uploaded(job.imageFiles.length)} · {t.images.matched(matched.length)}
              </li>
              {missing.length > 0 ? (
                <li className="text-error">
                  {t.images.missing}:{" "}
                  {missing
                    .slice(0, 20)
                    .map((m) => m.fileName)
                    .join(", ")}
                </li>
              ) : null}
              {unmatched.length > 0 ? (
                <li className="text-charcoal/70">
                  {t.images.unmatched}:{" "}
                  {unmatched
                    .slice(0, 20)
                    .map((f) => f.name)
                    .join(", ")}
                </li>
              ) : null}
              {refused.map((r) => (
                <li key={r.name} className="text-error">
                  {t.images.refused}: {r.name} ({r.reason})
                </li>
              ))}
            </ul>
            {progress ? (
              <div role="status" className="space-y-1">
                <p className="text-[13px] font-semibold text-deep-blue">
                  {t.images.uploading(progress.done, progress.total)}
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-mint-mist">
                  <div
                    className="h-full bg-emerald-brand"
                    style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
                  />
                </div>
              </div>
            ) : null}
            {matched.length > 0 ? (
              <Button type="button" variant="deep" size="sm" disabled={busy} onClick={uploadImages}>
                {t.images.upload(matched.length)}
              </Button>
            ) : null}
          </section>

          {job.existingImages.length > 0 ? (
            <section className="space-y-4 rounded-3xl border border-hairline bg-white p-5">
              <h2 className="font-display text-xl text-deep-blue">{t.images.existing}</h2>
              <p className="text-[13px] text-charcoal/75">{t.images.existingHint}</p>
              {job.existingImages.map(({ slug, images }) => {
                const removed = job.removedImages[slug] ?? [];
                return (
                  <div key={slug} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-deep-blue">{slug}</p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void toggleRemoved(
                            slug,
                            removed.length === images.length ? [] : images.map((i) => i.mediaId),
                          )
                        }
                        className="min-h-11 rounded-full px-3 text-[12.5px] font-semibold text-error hover:bg-error/5"
                      >
                        {removed.length === images.length ? t.images.keepAll : t.images.removeAll}
                      </button>
                    </div>
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {images.map((image) => {
                        const gone = removed.includes(image.mediaId);
                        return (
                          <li key={image.mediaId} className="relative">
                            <ProductFrame className={cn(gone && "opacity-35")}>
                              <MediaImage
                                publicId={image.publicId}
                                alt={image.alt}
                                fill
                                sizes="120px"
                              />
                            </ProductFrame>
                            {gone ? (
                              <span className="absolute inset-x-1 bottom-1 rounded-full bg-error px-2 text-center text-[11px] font-semibold text-soft-white">
                                {t.images.removed}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              aria-label={TEXT.vi.images.remove}
                              aria-pressed={gone}
                              disabled={busy}
                              onClick={() =>
                                void toggleRemoved(
                                  slug,
                                  gone
                                    ? removed.filter((id) => id !== image.mediaId)
                                    : [...removed, image.mediaId],
                                )
                              }
                              className="absolute right-1 top-1 grid size-11 place-items-center rounded-full bg-soft-white/95 text-charcoal shadow"
                            >
                              <FiX aria-hidden="true" size={16} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </section>
          ) : null}

          <div className="flex flex-wrap justify-between gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep(1)}>
              {t.steps[1]}
            </Button>
            <Button type="button" size="sm" disabled={busy || pendingErrors > 0} onClick={commit}>
              {t.commit.start}
            </Button>
          </div>
          {pendingErrors > 0 ? (
            <p className="text-right text-[13px] text-error">{t.commit.blocked}</p>
          ) : null}
        </>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4 rounded-3xl border border-hairline bg-white p-5">
          <h2 className="font-display text-xl text-deep-blue">{t.commit.title}</h2>
          <div role="status">
            <p className="text-[14px] font-semibold text-deep-blue">
              {job.status === "done"
                ? t.commit.done(job.counts.done, job.counts.failed)
                : t.commit.running(finished, total)}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-mint-mist">
              <div
                className="h-full bg-emerald-brand"
                style={{ width: `${(finished / Math.max(1, total)) * 100}%` }}
              />
            </div>
          </div>
          {job.counts.failed > 0 ? (
            <div>
              <p className="mb-2 font-semibold text-error">{t.commit.failedTitle}</p>
              <ul className="space-y-1 text-[13px]">
                {job.rows
                  .filter((r) => r.result === "failed")
                  .map((r) => (
                    <li key={r.rowNumber}>
                      {t.row} {r.rowNumber} · {r.slug}: {r.resultError}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {job.status !== "done" ? (
              <Button type="button" size="sm" disabled={busy} onClick={commit}>
                {t.commit.resume}
              </Button>
            ) : null}
            <Button as={Link} href="/shop/products" variant="deep" size="sm">
              {t.commit.products}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setJob(null);
                setStep(0);
                setPicked([]);
                setRefused([]);
              }}
            >
              {t.commit.newImport}
            </Button>
          </div>
        </section>
      ) : null}
    </div>,
  );
}
