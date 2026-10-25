"use client";

import Image from "next/image";
import { FiAlertTriangle, FiArrowLeft, FiInfo, FiShield } from "react-icons/fi";

import { Button, Eyebrow, cn } from "@lavieco/ui";

import { LaviAgentMascot } from "@/shared/components/illustrations/laviagent-mascot";

import { TEXT } from "../constants/text";
import type { FlowImage, PickReason } from "../hooks/use-agent-flow";
import type { ClassifyResult, Material, MaterialId } from "../types";
import { MaterialChips } from "./material-chips";
import { SampleGallery } from "./sample-gallery";

const t = TEXT.vi;

const PICK_MESSAGE: Record<PickReason, string> = {
  offline: t.picker.offline,
  unknown: t.picker.unknown,
  failed: t.picker.failed,
  timeout: t.picker.timeout,
  network: t.picker.network,
  rate_limited: t.picker.rateLimited,
  correct: t.picker.correct,
};

/** Informational (not an error): an offline demo, or the visitor correcting a result. */
const CALM_REASONS: ReadonlySet<PickReason> = new Set(["offline", "correct"]);

type PickScreenProps = {
  reason: PickReason;
  image: FlowImage | null;
  materials: Material[];
  onPick: (material: MaterialId) => void;
  onPickSample: (material: Material) => void;
  onBack: () => void;
};

/**
 * Manual material choice: the safety net for unknown photos, failures, timeouts,
 * offline demos and "Không đúng? Sửa lại".
 */
export function PickScreen({
  reason,
  image,
  materials,
  onPick,
  onPickSample,
  onBack,
}: PickScreenProps) {
  const calm = CALM_REASONS.has(reason);
  const Icon = calm ? FiInfo : FiAlertTriangle;
  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-deep-blue hover:text-emerald-ink"
      >
        <FiArrowLeft aria-hidden="true" size={16} />
        {t.picker.back}
      </button>

      <div className="flex items-start gap-4">
        {image ? (
          <span className="relative size-20 shrink-0 overflow-hidden rounded-t-[2.5rem] rounded-b-xl border border-hairline bg-mint-mist sm:size-24">
            <Image
              src={image.url}
              alt={t.review.imageAlt}
              fill
              sizes="96px"
              unoptimized={image.kind === "upload"}
              className="object-cover"
            />
          </span>
        ) : (
          <LaviAgentMascot className="size-14 shrink-0" />
        )}
        <div className="min-w-0">
          <Eyebrow className="mb-1.5">{t.name}</Eyebrow>
          <h1 className="font-display text-3xl text-deep-blue sm:text-4xl">{t.picker.title}</h1>
          <p className="mt-1.5 text-sm text-charcoal/70">{t.picker.lead}</p>
        </div>
      </div>

      <p
        role={calm ? "status" : "alert"}
        className={cn(
          "mt-6 flex gap-2.5 rounded-2xl px-4 py-3 text-sm leading-relaxed",
          calm ? "bg-mint-mist text-deep-blue" : "border border-canary bg-canary/15 text-charcoal",
        )}
      >
        <Icon aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-deep-blue" />
        {PICK_MESSAGE[reason]}
      </p>

      <MaterialChips materials={materials} layout="grid" onPick={onPick} className="mt-6" />

      <h2 className="mb-4 mt-10 font-display text-2xl text-deep-blue">{t.picker.orSamples}</h2>
      <SampleGallery materials={materials} onPick={onPickSample} />
    </div>
  );
}

type HazardScreenProps = {
  image: FlowImage;
  result: ClassifyResult;
  onReset: () => void;
};

/** Hazardous items: a polite refusal and general advice, never a DIY guide. */
export function HazardScreen({ image, result, onReset }: HazardScreenProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start gap-4">
        <span className="relative size-20 shrink-0 overflow-hidden rounded-t-[2.5rem] rounded-b-xl border border-hairline bg-mint-mist sm:size-24">
          <Image
            src={image.url}
            alt={t.review.imageAlt}
            fill
            sizes="96px"
            unoptimized={image.kind === "upload"}
            className="object-cover"
          />
        </span>
        <div className="min-w-0">
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-canary bg-canary/20 px-3 py-1 text-xs font-semibold text-charcoal">
            <FiAlertTriangle aria-hidden="true" size={13} />
            {t.hazard.kinds[result.safetyFlags.hazardKind]}
          </span>
          <h1 className="font-display text-3xl leading-tight text-deep-blue sm:text-4xl">
            {t.hazard.title}
          </h1>
        </div>
      </div>
      <p role="alert" className="mt-5 text-base leading-relaxed text-charcoal/80">
        {t.hazard.body}
      </p>

      <section className="mt-8 rounded-[1.75rem] bg-mint-mist p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl text-deep-blue">
          <FiShield aria-hidden="true" size={18} className="text-emerald-ink" />
          {t.hazard.tipsTitle}
        </h2>
        <ul className="space-y-3 text-sm leading-relaxed text-charcoal/85">
          {t.hazard.tips.map((tip) => (
            <li key={tip} className="flex gap-2.5">
              <span
                aria-hidden="true"
                className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-brand"
              />
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <Button type="button" onClick={onReset} className="mt-8 w-full sm:w-auto">
        {t.hazard.another}
      </Button>
    </div>
  );
}
