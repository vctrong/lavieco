"use client";

import { FiCamera, FiImage, FiLock, FiUploadCloud } from "react-icons/fi";

import { Button, Eyebrow } from "@lavieco/ui";

import { LaviAgentMascot } from "@/shared/components/illustrations/laviagent-mascot";

import { TEXT } from "../../constants/text";
import type { Catalog, FallbackAnswer, Material, MaterialId } from "../../types";
import { MaterialChips } from "../material-chips";
import { SampleGallery } from "../sample-gallery";

const t = TEXT.vi;

type EmptyStateProps = {
  catalog: Catalog;
  dragging: boolean;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  onPickMaterial: (material: MaterialId) => void;
  onPickSample: (material: Material) => void;
  onAsk: (suggestion: FallbackAnswer) => void;
};

/**
 * A conversation before its first message. The photo drop zone and the samples are the
 * heart of the demo, so on desktop they take the full width of the thread, side by side.
 */
export function EmptyState({
  catalog,
  dragging,
  onOpenCamera,
  onOpenGallery,
  onPickMaterial,
  onPickSample,
  onAsk,
}: EmptyStateProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="flex items-start gap-3">
        <LaviAgentMascot className="size-11 sm:size-14" label={t.mascotAlt} />
        <div className="min-w-0">
          <Eyebrow className="mb-2">{t.home.kicker}</Eyebrow>
          <p className="rounded-3xl rounded-tl-md bg-mint-mist px-4 py-3 text-sm leading-relaxed text-deep-blue sm:max-w-xl">
            {t.home.greeting}
          </p>
        </div>
      </div>

      <h1 className="mt-6 break-words font-display text-3xl font-light leading-[1.1] tracking-tight text-deep-blue sm:text-4xl lg:text-5xl">
        {t.home.title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-charcoal/75">{t.home.lead}</p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
        <div
          className={
            dragging
              ? "flex min-w-0 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-emerald-brand bg-mint-mist p-6 text-center sm:p-10 lg:min-h-[320px]"
              : "flex min-w-0 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-deep-blue/15 bg-soft-white p-6 text-center sm:p-10 lg:min-h-[320px]"
          }
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-mint-mist text-emerald-ink">
            <FiUploadCloud aria-hidden="true" size={28} />
          </span>
          <p className="mt-4 font-display text-2xl text-deep-blue">
            {dragging ? t.home.dropActive : t.home.dropTitle}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-charcoal/65">{t.home.dropHint}</p>
          <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button type="button" onClick={onOpenCamera}>
              <FiCamera aria-hidden="true" size={17} />
              {t.home.takePhoto}
            </Button>
            <Button type="button" variant="secondary" onClick={onOpenGallery}>
              <FiImage aria-hidden="true" size={17} />
              {t.home.choosePhoto}
            </Button>
          </div>
        </div>

        <section className="min-w-0 rounded-[2rem] bg-mint-mist/60 p-5 sm:p-6">
          <h2 className="font-display text-2xl text-deep-blue">{t.home.samplesTitle}</h2>
          <p className="mb-4 mt-1 text-sm text-charcoal/70">{t.home.samplesHint}</p>
          <SampleGallery materials={catalog.materials} onPick={onPickSample} compact />
        </section>
      </div>

      <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-museum text-charcoal/60">
        {t.home.quickMaterials}
      </h2>
      <MaterialChips materials={catalog.materials} onPick={onPickMaterial} />

      <h2 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-museum text-charcoal/60">
        {t.home.quickQuestions}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {catalog.suggestions.map((suggestion) => (
          <li key={suggestion.id} className="min-w-0 max-w-full">
            <button
              type="button"
              onClick={() => onAsk(suggestion)}
              className="min-h-11 max-w-full rounded-full border border-hairline bg-soft-white px-4 py-2 text-left text-sm text-deep-blue transition-colors hover:border-emerald-brand hover:bg-mint-mist"
            >
              {suggestion.question}
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-6 flex items-start gap-2 text-xs text-charcoal/60">
        <FiLock aria-hidden="true" size={13} className="mt-0.5 shrink-0" />
        {t.home.privacy}
      </p>
    </div>
  );
}
