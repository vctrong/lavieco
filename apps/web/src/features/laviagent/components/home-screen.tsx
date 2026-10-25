"use client";

import { useRef, useState, type DragEvent } from "react";
import { FiAlertCircle, FiCamera, FiImage, FiLock, FiUploadCloud, FiX } from "react-icons/fi";

import { Button, Eyebrow, cn } from "@lavieco/ui";

import { LaviAgentMascot } from "@/shared/components/illustrations/laviagent-mascot";

import { ACCEPTED_IMAGE_TYPES } from "../constants/config";
import { TEXT } from "../constants/text";
import type { Material, MaterialId } from "../types";
import type { PrepareFailure } from "../utils/resize-image";
import { MaterialChips } from "./material-chips";
import { SampleGallery } from "./sample-gallery";
import { StepsStrip } from "./steps-strip";
import { BAR_BUTTON, BAR_PRIMARY, BAR_SECONDARY, BOTTOM_BAR } from "./styles";

const t = TEXT.vi;

const NOTICE: Record<PrepareFailure, string> = {
  invalid: t.imageErrors.invalid,
  heic: t.imageErrors.heic,
  too_large: t.imageErrors.tooLarge,
};

type HomeScreenProps = {
  materials: Material[];
  notice: PrepareFailure | null;
  onFile: (file: File) => void;
  onDismissNotice: () => void;
  onPickMaterial: (material: MaterialId) => void;
  onPickSample: (material: Material) => void;
};

export function HomeScreen({
  materials,
  notice,
  onFile,
  onDismissNotice,
  onPickMaterial,
  onPickSample,
}: HomeScreenProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    take(event.dataTransfer.files);
  };

  const inputs = (
    <>
      {/* Two inputs: `capture` opens the camera directly on phones, the other the gallery. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
    </>
  );

  return (
    <div className="pb-28 md:pb-0">
      {inputs}

      <div className="flex items-start gap-3 sm:gap-4">
        <LaviAgentMascot className="size-12 sm:size-14" label={t.mascotAlt} />
        <div className="min-w-0">
          <Eyebrow className="mb-2">{t.home.kicker}</Eyebrow>
          <p className="rounded-3xl rounded-tl-md bg-mint-mist px-4 py-3 text-sm leading-relaxed text-deep-blue sm:max-w-xl">
            {t.home.greeting}
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-light leading-[1.1] tracking-tight text-deep-blue sm:text-5xl lg:text-[3.4rem]">
            {t.home.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-charcoal/75">{t.home.lead}</p>

          {notice ? (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-2xl border border-error/40 bg-soft-white p-4 text-sm text-charcoal"
            >
              <FiAlertCircle aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-error" />
              <p className="flex-1">{NOTICE[notice]}</p>
              <button
                type="button"
                onClick={onDismissNotice}
                aria-label={t.imageErrors.dismiss}
                className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-full text-charcoal/60 hover:bg-mint-mist"
              >
                <FiX aria-hidden="true" size={16} />
              </button>
            </div>
          ) : null}

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "mt-6 rounded-[2rem] border-2 border-dashed p-6 text-center transition-colors sm:p-10",
              dragging ? "border-emerald-brand bg-mint-mist" : "border-deep-blue/15 bg-soft-white",
            )}
          >
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-mint-mist text-emerald-ink">
              <FiUploadCloud aria-hidden="true" size={24} />
            </span>
            <p className="mt-4 font-display text-xl text-deep-blue">
              {dragging ? t.home.dropActive : t.home.dropTitle}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-charcoal/65">{t.home.dropHint}</p>
            {/* On phones the same two actions sit in the bottom bar, under the thumb. */}
            <div className="mt-6 hidden flex-wrap justify-center gap-3 md:flex">
              <Button type="button" onClick={() => cameraRef.current?.click()}>
                <FiCamera aria-hidden="true" size={17} />
                {t.home.takePhoto}
              </Button>
              <Button type="button" variant="secondary" onClick={() => galleryRef.current?.click()}>
                <FiImage aria-hidden="true" size={17} />
                {t.home.choosePhoto}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="mt-5 min-h-11 text-sm font-semibold text-emerald-ink underline underline-offset-4 md:hidden"
            >
              {t.home.choosePhoto}
            </button>
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-charcoal/60">
            <FiLock aria-hidden="true" size={13} />
            {t.home.privacy}
          </p>

          <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-museum text-charcoal/60">
            {t.home.quickMaterials}
          </h2>
          <MaterialChips materials={materials} onPick={onPickMaterial} />
        </div>

        <aside className="rounded-[2rem] bg-mint-mist/60 p-5 sm:p-7 lg:self-start">
          <h2 className="font-display text-2xl text-deep-blue">{t.home.samplesTitle}</h2>
          <p className="mb-5 mt-1 text-sm text-charcoal/70">{t.home.samplesHint}</p>
          <SampleGallery materials={materials} onPick={onPickSample} />
        </aside>
      </div>

      <section className="mt-16">
        <h2 className="mb-5 font-display text-2xl text-deep-blue sm:text-3xl">
          {t.home.stepsTitle}
        </h2>
        <StepsStrip />
      </section>

      {/* Phones: the two main actions in the thumb zone, above the home indicator. */}
      <div className={cn(BOTTOM_BAR, "md:hidden")}>
        <div className="mx-auto flex max-w-md gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className={cn(BAR_BUTTON, BAR_PRIMARY, "flex-[1.2]")}
          >
            <FiCamera aria-hidden="true" size={18} />
            {t.home.takePhoto}
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className={cn(BAR_BUTTON, BAR_SECONDARY, "flex-1")}
          >
            <FiImage aria-hidden="true" size={18} />
            {t.home.choosePhoto}
          </button>
        </div>
      </div>
    </div>
  );
}
