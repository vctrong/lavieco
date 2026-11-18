"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiFolder,
  FiLoader,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

import type { HandbookChapter } from "@lavieco/shared/content";
import { Button, SelectField, cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import type { ImportState, ImportTarget } from "../hooks/use-handbook-import";
import { checkHandbookFile } from "../utils/chunked-upload";

const u = TEXT.vi.upload;
const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

/** Progress of the current upload/import, in words (also read by screen readers). */
export function ImportStatus({ state, onClose }: { state: ImportState; onClose: () => void }) {
  if (state.phase === "idle") return null;
  const tone =
    state.phase === "failed"
      ? "border-error/40 bg-error/5 text-error"
      : state.phase === "done"
        ? "border-emerald-brand/40 bg-mint-mist text-deep-blue"
        : "border-hairline bg-white text-deep-blue";
  const message =
    state.phase === "sending"
      ? u.sending(state.name, state.percent)
      : state.phase === "processing"
        ? state.job.status === "queued"
          ? u.queued(state.job.queuePosition ?? 1)
          : u.running(state.job.done, state.job.total)
        : state.phase === "done"
          ? u.done(state.job.total)
          : state.message;
  const percent =
    state.phase === "sending"
      ? state.percent
      : state.phase === "processing" && state.job.total > 0
        ? Math.round((state.job.done / state.job.total) * 100)
        : null;
  return (
    <div role="status" aria-live="polite" className={cn("rounded-2xl border p-4", tone)}>
      <div className="flex items-start gap-3">
        {state.phase === "failed" ? (
          <FiAlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
        ) : state.phase === "done" ? (
          <FiCheckCircle
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-emerald-ink"
            size={18}
          />
        ) : (
          <FiLoader
            aria-hidden="true"
            className="mt-0.5 shrink-0 motion-safe:animate-spin"
            size={18}
          />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[14px] font-semibold">{message}</p>
          {percent !== null ? (
            <div className="h-2 overflow-hidden rounded-full bg-mint-mist">
              <div
                className="h-full rounded-full bg-emerald-brand"
                style={{ width: `${percent}%` }}
              />
            </div>
          ) : null}
          {state.phase === "done" && state.notes.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-charcoal/80">
              {state.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </div>
        {state.phase === "done" || state.phase === "failed" ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={TEXT.vi.upload.cancel}
            className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/70"
          >
            <FiX aria-hidden="true" size={18} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Drop zone of the handbook: one PDF (the whole book, or pages to add) or several page
 * images. Asks what a PDF is for before sending it.
 */
export function UploadZone({
  chapters,
  hasPages,
  busy,
  onStart,
}: {
  chapters: HandbookChapter[];
  hasPages: boolean;
  busy: boolean;
  onStart: (files: File[], target: ImportTarget) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"replace_all" | "append">(hasPages ? "append" : "replace_all");
  const [chapterId, setChapterId] = useState(chapters[chapters.length - 1]?.id ?? "");

  const isPdf =
    files.length === 1 &&
    checkHandbookFile(files[0]!).ok &&
    /pdf/i.test(files[0]!.type + files[0]!.name);

  const pick = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setFiles([...list].sort((a, b) => a.name.localeCompare(b.name, "vi", { numeric: true })));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    if (!busy) pick(event.dataTransfer.files);
  };

  const submit = () => {
    const target: ImportTarget =
      isPdf && mode === "replace_all" ? { mode: "replace_all" } : { mode: "append", chapterId };
    onStart(files, target);
    setFiles([]);
  };

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-3xl border-2 border-dashed p-5 transition-colors md:p-6",
        over ? "border-emerald-brand bg-mint-mist" : "border-hairline bg-white",
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mint-mist text-emerald-ink">
            <FiUploadCloud aria-hidden="true" size={22} />
          </span>
          <div>
            <h2 className="font-display text-lg text-deep-blue">{u.title}</h2>
            <p className="mt-1 text-[13.5px] text-charcoal/75">{u.hint}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <FiFolder aria-hidden="true" size={16} />
          {u.choose}
        </Button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            pick(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <details className="mt-4 text-[13.5px] text-charcoal/80">
        <summary className="min-h-11 cursor-pointer content-center font-semibold text-emerald-ink">
          {u.guide}
        </summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          {u.guideSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>

      {files.length > 0 ? (
        <div className="mt-4 space-y-4 rounded-2xl bg-soft-white p-4">
          <p className="text-[13.5px] font-semibold text-deep-blue">
            {files.length === 1
              ? files[0]!.name
              : u.picked(files.length, files[0]!.name, files.at(-1)!.name)}
          </p>
          {isPdf ? (
            <fieldset className="space-y-2">
              <legend className="text-[13px] font-semibold text-deep-blue">{u.modeLabel}</legend>
              {(["replace_all", "append"] as const).map((value) => (
                <label
                  key={value}
                  className="flex min-h-11 items-center gap-2 text-[13.5px] text-charcoal"
                >
                  <input
                    type="radio"
                    name="handbook-import-mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value)}
                    className="size-5 accent-emerald-ink"
                  />
                  {u.modes[value]}
                </label>
              ))}
            </fieldset>
          ) : null}
          {!isPdf || mode === "append" ? (
            <SelectField
              tone="light"
              label={u.chapterLabel}
              value={chapterId}
              options={chapters.map((chapter) => ({ value: chapter.id, label: chapter.title }))}
              onChange={(event) => setChapterId(event.target.value)}
            />
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={submit} disabled={busy}>
              {u.start}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setFiles([])}>
              {u.cancel}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
