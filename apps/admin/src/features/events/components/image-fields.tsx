"use client";

import { useId, useRef, type ChangeEvent, type ReactNode } from "react";
import { FiArrowDown, FiArrowUp, FiImage, FiPlus, FiTrash2, FiUpload } from "react-icons/fi";

import { MEDIA_ACCEPT, MEDIA_LIMITS } from "@lavieco/shared/media";
import { Button, TextField, cn } from "@lavieco/ui";

import { MediaImage } from "@/shared/components/media-image";

import { TEXT } from "../constants/text";
import { useImageUpload } from "../hooks/use-image-upload";
import type { EventImageValue } from "../utils/details-values";

const t = TEXT.vi.images;

/** Hidden file input opened by a visible button (keyboard and screen readers included). */
function FilePicker({
  label,
  icon,
  disabled,
  onFile,
}: {
  label: string;
  icon: ReactNode;
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const handle = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFile(file);
  };
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={MEDIA_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handle}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-2 disabled:opacity-60"
      >
        {icon}
        {label}
      </Button>
    </>
  );
}

function Thumbnail({ image, className }: { image: EventImageValue | null; className?: string }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-arch-sm bg-mint-mist text-deep-blue/40",
        className,
      )}
    >
      {image ? (
        <MediaImage
          publicId={image.publicId}
          alt={image.alt}
          fill
          sizes="160px"
          className="object-cover"
        />
      ) : (
        <FiImage aria-hidden="true" size={18} />
      )}
    </span>
  );
}

function UploadStatus({ busy, error }: { busy: boolean; error: string | null }) {
  if (busy) {
    return (
      <p role="status" className="text-[12.5px] text-deep-blue/70">
        {t.uploading}
      </p>
    );
  }
  return error ? (
    <p role="alert" className="text-[12.5px] font-medium text-deep-blue">
      {error}
    </p>
  ) : null;
}

type CoverFieldProps = {
  value: EventImageValue | null;
  saved: boolean;
  disabled: boolean;
  error?: string;
  onChange: (value: EventImageValue | null) => void;
};

/** Cover image: upload (or replace), alt text, remove. Saved with the details form. */
export function CoverField({ value, saved, disabled, error, onChange }: CoverFieldProps) {
  const { upload, busy, error: uploadError } = useImageUpload("event_cover");
  const labelId = useId();
  const pick = async (file: File) => {
    const uploaded = await upload(file, value?.alt ?? "");
    if (uploaded) onChange(uploaded);
  };
  return (
    <div role="group" aria-labelledby={labelId}>
      <p
        id={labelId}
        className="mb-1.5 text-[11px] font-medium uppercase tracking-museum text-deep-blue/70"
      >
        {TEXT.vi.editor.fields.cover}
      </p>
      <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-deep-blue/20 bg-soft-white p-4 sm:flex-row">
        <Thumbnail image={value} className="h-28 w-24" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-[12.5px] leading-relaxed text-charcoal/65">
            {value ? t.coverHint : t.coverEmpty}
          </p>
          {value ? (
            <TextField
              tone="light"
              label={t.alt}
              placeholder={t.altPlaceholder}
              value={value.alt}
              maxLength={MEDIA_LIMITS.altMax}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              error={error}
              disabled={disabled}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <FilePicker
              label={value ? t.replace : t.choose}
              icon={<FiUpload aria-hidden="true" size={13} />}
              disabled={disabled || busy}
              onFile={pick}
            />
            {value ? (
              <Button
                type="button"
                variant="link"
                disabled={disabled || busy}
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1.5 text-[12.5px]"
              >
                <FiTrash2 aria-hidden="true" size={13} />
                {t.remove}
              </Button>
            ) : null}
          </div>
          {value && !saved ? (
            <p className="text-[12px] text-deep-blue/60">{t.notSavedYet}</p>
          ) : null}
          <UploadStatus busy={busy} error={uploadError} />
        </div>
      </div>
    </div>
  );
}

type GalleryFieldProps = {
  items: EventImageValue[];
  savedIds: ReadonlySet<string>;
  disabled: boolean;
  errors: Record<string, string>;
  onChange: (items: EventImageValue[]) => void;
};

/** Up to 12 photos, ordered, each with its alt text. */
export function GalleryField({ items, savedIds, disabled, errors, onChange }: GalleryFieldProps) {
  const { upload, busy, error } = useImageUpload("event_gallery");
  const labelId = useId();
  const full = items.length >= MEDIA_LIMITS.eventGalleryMax;

  const add = async (file: File) => {
    const uploaded = await upload(file);
    if (uploaded) onChange([...items, uploaded]);
  };
  const update = (index: number, next: EventImageValue) =>
    onChange(items.map((item, at) => (at === index ? next : item)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item!);
    onChange(next);
  };

  return (
    <div role="group" aria-labelledby={labelId}>
      <p
        id={labelId}
        className="mb-1 text-[11px] font-medium uppercase tracking-museum text-deep-blue/70"
      >
        {t.gallery}
      </p>
      <p className="mb-3 text-[12.5px] text-charcoal/65">{t.galleryHint}</p>
      {items.length > 0 ? (
        <ol className="mb-3 space-y-3">
          {items.map((item, index) => (
            <li
              key={item.mediaId}
              className="flex flex-col gap-3 rounded-2xl border border-hairline bg-white p-3 sm:flex-row sm:items-start"
            >
              <Thumbnail image={item} className="h-20 w-20" />
              <div className="min-w-0 flex-1">
                <TextField
                  tone="light"
                  label={t.alt}
                  placeholder={t.altPlaceholder}
                  value={item.alt}
                  maxLength={MEDIA_LIMITS.altMax}
                  onChange={(e) => update(index, { ...item, alt: e.target.value })}
                  error={errors[`gallery.${index}.alt`]}
                  disabled={disabled}
                />
                {!savedIds.has(item.mediaId) ? (
                  <p className="mt-1.5 text-[12px] text-deep-blue/60">{t.notSavedYet}</p>
                ) : null}
              </div>
              <div className="flex gap-1 sm:flex-col">
                <button
                  type="button"
                  aria-label={t.moveUp}
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded-full p-2 text-deep-blue/70 hover:bg-mint-mist disabled:opacity-30"
                >
                  <FiArrowUp aria-hidden="true" size={14} />
                </button>
                <button
                  type="button"
                  aria-label={t.moveDown}
                  disabled={disabled || index === items.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded-full p-2 text-deep-blue/70 hover:bg-mint-mist disabled:opacity-30"
                >
                  <FiArrowDown aria-hidden="true" size={14} />
                </button>
                <button
                  type="button"
                  aria-label={t.remove}
                  disabled={disabled}
                  onClick={() => onChange(items.filter((_, at) => at !== index))}
                  className="rounded-full p-2 text-deep-blue/70 hover:bg-mint-mist disabled:opacity-30"
                >
                  <FiTrash2 aria-hidden="true" size={14} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {full ? (
        <p className="text-[12.5px] text-deep-blue/60">{t.galleryFull}</p>
      ) : (
        <FilePicker
          label={t.add}
          icon={<FiPlus aria-hidden="true" size={13} />}
          disabled={disabled || busy}
          onFile={add}
        />
      )}
      <div className="mt-2">
        <UploadStatus busy={busy} error={error} />
      </div>
    </div>
  );
}
