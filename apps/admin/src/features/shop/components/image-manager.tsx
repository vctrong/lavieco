"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiLoader,
  FiMove,
  FiStar,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

import { MEDIA_ACCEPT, checkImageFile } from "@lavieco/shared/media";
import { SHOP_LIMITS } from "@lavieco/shared/shop";
import { ProductFrame, SelectField, TextField, cn, useToast } from "@lavieco/ui";

import { MediaImage } from "@/shared/components/media-image";

import { TEXT } from "../constants/text";
import type { ProductImageValue, UploadFailure, UploadResult } from "../types";

const t = TEXT.vi.images;
const CONCURRENCY = 3;

type Pending = { key: string; name: string; error: string | null; file: File };

function messageOf(reason: UploadFailure, format?: string) {
  return t.errors[reason].replace("{format}", (format ?? "HEIC").toUpperCase());
}

async function uploadOne(file: File): Promise<ProductImageValue | string> {
  const issue = checkImageFile(file, "product_image");
  if (issue)
    return messageOf(issue.code, issue.code === "format_refused" ? issue.format : undefined);
  const body = new FormData();
  body.set("file", file);
  try {
    const response = await fetch("/api/media/product-images", { method: "POST", body });
    const result = (await response.json().catch(() => null)) as UploadResult | null;
    if (result?.status === "ok") {
      const { id, publicId, width, height } = result.media;
      return { mediaId: id, publicId, width, height, alt: "", variantValues: [] };
    }
    return result?.status === "error"
      ? messageOf(result.reason, result.format)
      : messageOf("unavailable");
  } catch {
    return messageOf("unavailable");
  }
}

function SortableImage({
  image,
  index,
  count,
  variantChoices,
  disabled,
  onChange,
  onMove,
  onRemove,
}: {
  image: ProductImageValue;
  index: number;
  count: number;
  variantChoices: { value: string; label: string }[];
  disabled: boolean;
  onChange: (next: ProductImageValue) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.mediaId,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const cover = index === 0;
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-3 rounded-3xl border bg-white p-3",
        cover ? "border-emerald-brand" : "border-hairline",
        isDragging && "z-10 shadow-lg motion-safe:scale-[1.02]",
      )}
    >
      <div className="relative">
        <ProductFrame>
          <MediaImage
            publicId={image.publicId}
            alt={image.alt}
            fill
            sizes="(min-width: 768px) 220px, 45vw"
          />
        </ProductFrame>
        {cover ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-deep-blue px-2.5 py-1 text-[11px] font-semibold text-soft-white">
            <FiStar aria-hidden="true" size={11} />
            {t.cover}
          </span>
        ) : null}
        <button
          type="button"
          aria-label={`${t.remove} ${index + 1}`}
          onClick={onRemove}
          disabled={disabled}
          className="absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-soft-white/95 text-charcoal shadow hover:bg-white"
        >
          <FiX aria-hidden="true" size={18} />
        </button>
        <button
          type="button"
          aria-label={t.drag}
          disabled={disabled}
          {...attributes}
          {...listeners}
          className="absolute bottom-2 right-2 grid size-11 cursor-grab touch-none place-items-center rounded-full bg-soft-white/95 text-deep-blue shadow active:cursor-grabbing"
        >
          <FiMove aria-hidden="true" size={17} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label={t.moveLeft}
          disabled={disabled || index === 0}
          onClick={() => onMove(index - 1)}
          className="grid size-11 place-items-center rounded-full text-deep-blue hover:bg-mint-mist disabled:opacity-30"
        >
          <FiArrowLeft aria-hidden="true" size={16} />
        </button>
        {!cover ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onMove(0)}
            className="min-h-11 rounded-full px-3 text-[12.5px] font-semibold text-emerald-ink hover:bg-mint-mist"
          >
            {t.makeCover}
          </button>
        ) : null}
        <button
          type="button"
          aria-label={t.moveRight}
          disabled={disabled || index === count - 1}
          onClick={() => onMove(index + 1)}
          className="grid size-11 place-items-center rounded-full text-deep-blue hover:bg-mint-mist disabled:opacity-30"
        >
          <FiArrowRight aria-hidden="true" size={16} />
        </button>
      </div>
      <TextField
        tone="light"
        label={t.alt}
        placeholder={t.altPlaceholder}
        value={image.alt}
        maxLength={200}
        disabled={disabled}
        onChange={(event) => onChange({ ...image, alt: event.target.value })}
      />
      {variantChoices.length > 0 ? (
        <SelectField
          tone="light"
          label={t.variant}
          value={image.variantValues[0] ?? ""}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...image, variantValues: event.target.value ? [event.target.value] : [] })
          }
          options={[{ value: "", label: t.variantAll }, ...variantChoices]}
        />
      ) : null}
    </li>
  );
}

/**
 * Product images (docs/08 §6.2): several at once, drag (mouse, touch, keyboard) or ← →
 * to reorder, the first is the cover, × removes one with an undo toast, alt text and an
 * optional variant per image. Uploads go through the admin BFF, three at a time.
 */
export function ImageManager({
  images,
  onChange,
  variantChoices,
  disabled,
}: {
  images: ProductImageValue[];
  onChange: (images: ProductImageValue[]) => void;
  variantChoices: { value: string; label: string }[];
  disabled: boolean;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [done, setDone] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  // The latest list, for uploads that finish after other edits.
  const latest = useRef(images);
  useEffect(() => {
    latest.current = images;
  }, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const room = SHOP_LIMITS.imagesMax - images.length - pending.filter((p) => !p.error).length;
  const uploading = pending.some((p) => !p.error);

  async function addFiles(list: FileList | File[]) {
    const files = [...list].slice(0, Math.max(0, room));
    if (files.length === 0) {
      toast({ tone: "info", message: t.full });
      return;
    }
    const batch = files.map((file, i) => ({
      key: `${Date.now()}-${i}`,
      name: file.name,
      error: null,
      file,
    }));
    setPending((current) => [...current, ...batch]);
    setDone(0);
    let next = 0;
    const worker = async () => {
      while (next < batch.length) {
        const item = batch[next++]!;
        const result = await uploadOne(item.file);
        setDone((n) => n + 1);
        if (typeof result === "string") {
          setPending((current) =>
            current.map((p) => (p.key === item.key ? { ...p, error: result } : p)),
          );
        } else {
          setPending((current) => current.filter((p) => p.key !== item.key));
          const updated = [...latest.current, result];
          latest.current = updated;
          onChange(updated);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batch.length) }, worker));
  }

  const retry = (item: Pending) => {
    setPending((current) => current.filter((p) => p.key !== item.key));
    void addFiles([item.file]);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    onChange(arrayMove(images, from, to));
  };

  const remove = (index: number) => {
    const before = images;
    onChange(images.filter((_, i) => i !== index));
    toast({
      tone: "info",
      message: t.removed,
      action: { label: t.undo, onClick: () => onChange(before) },
    });
  };

  const removeAll = () => {
    const before = images;
    onChange([]);
    toast({
      tone: "info",
      message: t.removed,
      action: { label: t.undo, onClick: () => onChange(before) },
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = images.findIndex((image) => image.mediaId === active.id);
    const to = images.findIndex((image) => image.mediaId === over.id);
    if (from >= 0 && to >= 0) move(from, to);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (!disabled && event.dataTransfer.files.length > 0) void addFiles(event.dataTransfer.files);
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? [...event.target.files] : [];
    event.target.value = "";
    if (files.length > 0) void addFiles(files);
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-charcoal/75">{t.hint}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={images.map((image) => image.mediaId)}
          strategy={rectSortingStrategy}
        >
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {images.map((image, index) => (
              <SortableImage
                key={image.mediaId}
                image={image}
                index={index}
                count={images.length}
                variantChoices={variantChoices}
                disabled={disabled}
                onChange={(next) => onChange(images.map((img, i) => (i === index ? next : img)))}
                onMove={(to) => move(index, to)}
                onRemove={() => remove(index)}
              />
            ))}
            {pending.map((item) => (
              <li
                key={item.key}
                className="flex flex-col gap-2 rounded-3xl border border-hairline bg-white p-3"
                aria-busy={!item.error}
              >
                <ProductFrame className="flex items-center justify-center">
                  {item.error ? (
                    <span className="px-3 text-center text-[12.5px] text-error">{item.error}</span>
                  ) : (
                    <span className="flex h-full items-center justify-center text-deep-blue/60">
                      <FiLoader aria-hidden="true" size={22} className="motion-safe:animate-spin" />
                    </span>
                  )}
                </ProductFrame>
                <p className="truncate text-[12px] text-charcoal/70">{item.name}</p>
                {item.error ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => retry(item)}
                      className="min-h-11 flex-1 rounded-full border border-hairline text-[12.5px] font-semibold text-deep-blue hover:bg-mint-mist"
                    >
                      {t.retry}
                    </button>
                    <button
                      type="button"
                      aria-label={t.remove}
                      onClick={() =>
                        setPending((current) => current.filter((p) => p.key !== item.key))
                      }
                      className="grid size-11 place-items-center rounded-full text-charcoal/70 hover:bg-mint-mist"
                    >
                      <FiX aria-hidden="true" size={16} />
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {uploading ? (
        <p role="status" className="text-[13px] font-semibold text-deep-blue">
          {t.uploading(done, done + pending.filter((p) => !p.error).length)}
        </p>
      ) : null}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-3xl border-2 border-dashed p-6 text-center",
          dragOver ? "border-emerald-brand bg-mint-mist" : "border-deep-blue/20 bg-soft-white",
        )}
      >
        <input
          ref={input}
          type="file"
          accept={MEDIA_ACCEPT}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onPick}
          disabled={disabled || room <= 0}
        />
        <button
          type="button"
          disabled={disabled || room <= 0}
          onClick={() => input.current?.click()}
          className="mx-auto flex min-h-11 flex-col items-center gap-2 rounded-2xl px-4 py-2 text-[14px] font-semibold text-deep-blue disabled:opacity-50"
        >
          <FiUploadCloud aria-hidden="true" size={26} />
          {room <= 0 ? t.full : t.drop}
        </button>
      </div>

      {images.length > 1 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={removeAll}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-[13px] font-semibold text-error hover:bg-error/5"
        >
          <FiTrash2 aria-hidden="true" size={15} />
          {t.removeAll}
        </button>
      ) : null}
    </div>
  );
}
