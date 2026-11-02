"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { EVENT_POSTER_RATIOS, type EventPosterRatio } from "@lavieco/shared/events";
import { Button, cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import {
  CROP_ZOOM_MAX,
  centredOffset,
  clampOffset,
  cropRect,
  displayedSize,
  outputSize,
  ratioValue,
  type Offset,
  type Size,
} from "../utils/crop";

const t = TEXT.vi.images.crop;
const FRAME_WIDTH = 320;
const KEY_STEP = 12;
const JPEG_QUALITY = 0.92;

type ImageCropDialogProps = {
  file: File;
  initialRatio: EventPosterRatio;
  onCancel: () => void;
  onCropped: (file: File, ratio: EventPosterRatio) => void;
};

/**
 * Crops a poster before it is uploaded. Cropping happens here, not at delivery: the
 * Cloudinary account runs strict transformations, so a URL cannot carry arbitrary
 * coordinates (ADR-0020). The service still re-checks and re-encodes what it receives.
 */
export function ImageCropDialog({ file, initialRatio, onCancel, onCropped }: ImageCropDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [url] = useState(() => URL.createObjectURL(file));
  const [natural, setNatural] = useState<Size | null>(null);
  const [ratio, setRatio] = useState(initialRatio);
  const [zoom, setZoom] = useState(1);
  const [moved, setMoved] = useState<Offset | null>(null);
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ x: number; y: number; from: Offset } | null>(null);
  const photo = useRef<HTMLImageElement>(null);

  const frame: Size = { width: FRAME_WIDTH, height: FRAME_WIDTH / ratioValue(ratio) };
  // Null until the photo is moved, so the first look (and any new ratio) is centred.
  const offset = natural
    ? clampOffset(moved ?? centredOffset(natural, frame, zoom), natural, frame, zoom)
    : { x: 0, y: 0 };

  useEffect(() => {
    dialog.current?.showModal();
    return () => URL.revokeObjectURL(url);
  }, [url]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, from: offset };
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setMoved({
      x: drag.current.from.x + event.clientX - drag.current.x,
      y: drag.current.from.y + event.clientY - drag.current.y,
    });
  };
  const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
    const by = {
      ArrowLeft: { x: -KEY_STEP, y: 0 },
      ArrowRight: { x: KEY_STEP, y: 0 },
      ArrowUp: { x: 0, y: -KEY_STEP },
      ArrowDown: { x: 0, y: KEY_STEP },
    }[event.key];
    if (!by) return;
    event.preventDefault();
    setMoved({ x: offset.x + by.x, y: offset.y + by.y });
  };

  const confirm = () => {
    if (!natural || !photo.current) return;
    const rect = cropRect(offset, natural, frame, zoom);
    const size = outputSize(rect);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) {
      setFailed(true);
      return;
    }
    context.drawImage(
      photo.current,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      size.width,
      size.height,
    );
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setFailed(true);
          return;
        }
        const name = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
        onCropped(new File([blob], name, { type: "image/jpeg" }), ratio);
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  };

  const shown = natural ? displayedSize(natural, frame, zoom) : frame;
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={onCancel}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl bg-white p-6 shadow-gallery backdrop:bg-charcoal/50"
    >
      <h2 id={titleId} className="font-display text-xl text-deep-blue">
        {t.title}
      </h2>
      <p className="mt-1 text-[13px] text-charcoal/70">{t.intro}</p>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-[11px] font-medium uppercase tracking-museum text-deep-blue/70">
          {t.ratio}
        </legend>
        <div className="flex gap-2">
          {EVENT_POSTER_RATIOS.map((option) => (
            <label
              key={option}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-[13px] has-focus-visible:outline-2 has-focus-visible:outline-emerald-brand",
                ratio === option
                  ? "border-emerald-brand bg-mint-mist font-semibold text-deep-blue"
                  : "border-hairline text-charcoal/75",
              )}
            >
              <input
                type="radio"
                name={`${titleId}-ratio`}
                className="sr-only"
                checked={ratio === option}
                onChange={() => {
                  setRatio(option);
                  setMoved(null);
                }}
              />
              {t.ratios[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <div
        role="group"
        tabIndex={0}
        aria-label={t.area}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={nudge}
        style={{ width: frame.width, height: frame.height }}
        className="relative mx-auto mt-4 max-w-full cursor-grab touch-none overflow-hidden rounded-2xl bg-mint-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-brand active:cursor-grabbing"
      >
        {/* An object URL of a local file: nothing for the image optimizer to fetch. */}
        <Image
          ref={photo}
          src={url}
          alt=""
          unoptimized
          width={Math.round(shown.width)}
          height={Math.round(shown.height)}
          draggable={false}
          onLoad={(event) =>
            setNatural({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })
          }
          onError={() => setFailed(true)}
          style={{
            width: shown.width,
            height: shown.height,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
          }}
          className="absolute left-0 top-0 max-w-none select-none"
        />
      </div>

      <label className="mt-4 block text-[11px] font-medium uppercase tracking-museum text-deep-blue/70">
        {t.zoom}
        <input
          type="range"
          min={1}
          max={CROP_ZOOM_MAX}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="mt-1.5 block w-full accent-emerald-brand"
        />
      </label>

      {failed ? (
        <p role="alert" className="mt-3 text-[12.5px] font-medium text-error">
          {t.failed}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="button" size="sm" disabled={!natural || failed} onClick={confirm}>
          {t.confirm}
        </Button>
      </div>
    </dialog>
  );
}
