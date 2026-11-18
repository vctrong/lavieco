"use client";

import { useRef } from "react";
import { FiTrash2, FiUploadCloud } from "react-icons/fi";

import type { HandbookCoverSide, HandbookCovers } from "@lavieco/shared/content";

import { MediaImage } from "@/shared/components/media-image";

import { TEXT } from "../constants/text";

const c = TEXT.vi.covers;
const SIDES: HandbookCoverSide[] = ["front", "back"];
const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

function CoverSlot({
  side,
  image,
  removed,
  canWrite,
  busy,
  onUpload,
  onRemove,
}: {
  side: HandbookCoverSide;
  image: HandbookCovers["front"];
  removed: boolean;
  canWrite: boolean;
  busy: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const label = side === "front" ? c.front : c.back;
  const shown = image && !removed ? image : null;
  return (
    <div className="flex gap-4 rounded-2xl border border-hairline bg-soft-white p-3">
      <div className="relative aspect-[1/1.414] w-24 shrink-0 overflow-hidden rounded-r-lg rounded-l-sm bg-paper shadow-sm">
        {shown ? (
          <MediaImage
            publicId={shown.publicId}
            alt={c.imageAlt(label)}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-display text-lg text-deep-blue">{label}</p>
        {removed && image ? (
          <p className="text-[13px] font-semibold text-error">{c.removed}</p>
        ) : !shown ? (
          <p className="text-[13px] text-charcoal/70">
            {side === "front" ? c.emptyFront : c.emptyBack}
          </p>
        ) : null}
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-hairline bg-white px-4 text-[13px] font-semibold text-deep-blue hover:bg-mint-mist disabled:opacity-50"
            >
              <FiUploadCloud aria-hidden="true" size={15} />
              {shown ? c.replace : c.upload}
            </button>
            {shown ? (
              <button
                type="button"
                disabled={busy}
                onClick={onRemove}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-error hover:bg-error/10 disabled:opacity-50"
              >
                <FiTrash2 aria-hidden="true" size={15} />
                {c.remove}
              </button>
            ) : null}
            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onUpload(file);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Front and back covers: outside the chapters and without a page number. A cover is
 * uploaded like a page (image, or the first page of a PDF) and replaces the old one.
 */
export function CoversPanel({
  covers,
  keepCovers,
  canWrite,
  busy,
  onUpload,
  onRemove,
}: {
  covers: HandbookCovers;
  keepCovers: { front: boolean; back: boolean };
  canWrite: boolean;
  busy: boolean;
  onUpload: (side: HandbookCoverSide, file: File) => void;
  onRemove: (side: HandbookCoverSide) => void;
}) {
  return (
    <section
      aria-labelledby="handbook-covers"
      className="rounded-3xl border border-hairline bg-white p-4 md:p-5"
    >
      <h2 id="handbook-covers" className="font-display text-xl text-deep-blue">
        {c.heading}
      </h2>
      <p className="mt-1 text-[13px] text-charcoal/70">{c.hint}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SIDES.map((side) => (
          <CoverSlot
            key={side}
            side={side}
            image={covers[side]}
            removed={!keepCovers[side]}
            canWrite={canWrite}
            busy={busy}
            onUpload={(file) => onUpload(side, file)}
            onRemove={() => onRemove(side)}
          />
        ))}
      </div>
    </section>
  );
}
