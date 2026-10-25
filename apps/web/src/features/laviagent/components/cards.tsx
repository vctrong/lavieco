"use client";

import { useState } from "react";
import { FiAlertTriangle, FiEdit2, FiHeart, FiInfo, FiShield, FiX } from "react-icons/fi";

import { Eyebrow, cn } from "@lavieco/ui";

import { MATERIAL_ICONS } from "../constants/icons";
import { TEXT } from "../constants/text";
import { DIFFICULTIES } from "../schemas";
import type {
  AgentDataTypes,
  Catalog,
  Difficulty,
  Material,
  MaterialId,
  PickReason,
} from "../types";
import { IdeaCard } from "./idea-card";
import { KitChip } from "./kit-card";
import { MaterialChips } from "./material-chips";
import { SampleGallery } from "./sample-gallery";
import { WorkshopLink } from "./workshop-link";

const t = TEXT.vi;

/** Every card posted by LaviAgent sits in the same frame, full width of the thread. */
const CARD =
  "w-full space-y-5 rounded-[1.75rem] border border-hairline bg-soft-white p-4 shadow-ambient sm:p-5";

export type CardActions = {
  conversationId: string;
  onPickMaterial: (material: MaterialId, correction?: boolean) => void;
  onPickSample: (material: Material) => void;
  /** Cards of older messages stay readable but their buttons do nothing new. */
  disabled: boolean;
};

/**
 * The analysis of a photo, a sample or a chip: material, confidence, "Sửa lại", safety,
 * recycling potential, then the ideas (filterable in place) and the KIT.
 */
export function AnalysisCard({
  data,
  catalog,
  actions,
}: {
  data: AgentDataTypes["analysis"];
  catalog: Catalog;
  actions: CardActions;
}) {
  const [filter, setFilter] = useState<Difficulty | "all">("all");
  const [correcting, setCorrecting] = useState(false);
  const material = catalog.materials.find((item) => item.id === data.material);
  if (!material) return null;

  const { result, source } = data;
  const Icon = MATERIAL_ICONS[material.icon];
  const ideas = catalog.ideas.filter((idea) => idea.material === material.id);
  const visible = filter === "all" ? ideas : ideas.filter((idea) => idea.difficulty === filter);
  const kitId = ideas.find((idea) => idea.kitId)?.kitId;
  const kit = catalog.kits.find((item) => item.id === kitId);

  return (
    <article className={CARD}>
      <header className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mint-mist text-emerald-ink">
          <Icon aria-hidden="true" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <Eyebrow className="mb-1">
            {source === "sample"
              ? t.result.sourceSample
              : source === "manual"
                ? t.result.sourceManual
                : t.result.kicker}
          </Eyebrow>
          <h3 className="break-words font-display text-2xl leading-tight text-deep-blue sm:text-3xl">
            {material.name}
          </h3>
          {result ? (
            <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-xs text-charcoal/55">{t.result.shape}</dt>
                <dd className="break-words font-medium text-charcoal">{result.shape}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-charcoal/55">{t.result.condition}</dt>
                <dd className="break-words font-medium text-charcoal">{result.condition}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-charcoal/75">{material.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            {result ? (
              <span className="rounded-full bg-mint-mist px-3 py-1 text-xs font-semibold text-emerald-ink">
                {t.result.confidence(result.confidence)}
              </span>
            ) : null}
            {actions.disabled ? null : (
              <button
                type="button"
                onClick={() => setCorrecting((value) => !value)}
                aria-expanded={correcting}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-deep-blue underline-offset-4 hover:text-emerald-ink hover:underline"
              >
                {correcting ? (
                  <FiX aria-hidden="true" size={14} />
                ) : (
                  <FiEdit2 aria-hidden="true" size={14} />
                )}
                {correcting ? t.result.cancelPick : t.result.correct}
              </button>
            )}
          </div>
        </div>
      </header>

      {correcting ? (
        <section aria-label={t.result.pickTitle} className="rounded-2xl bg-mint-mist/60 p-3">
          <MaterialChips
            materials={catalog.materials}
            layout="grid"
            selected={material.id}
            onPick={(id) => {
              setCorrecting(false);
              if (id !== material.id) actions.onPickMaterial(id, true);
            }}
          />
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <section className="flex gap-3 rounded-2xl border border-canary bg-canary/10 p-4">
          <FiAlertTriangle
            aria-hidden="true"
            size={17}
            className="mt-0.5 shrink-0 text-deep-blue"
          />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-deep-blue">{t.result.safetyTitle}</h4>
            <p className="mt-1 text-sm leading-relaxed text-charcoal/85">{material.safetyNote}</p>
            {result?.safetyFlags.sharpEdges ? (
              <p className="mt-2 text-sm font-medium text-charcoal">{t.result.sharpEdges}</p>
            ) : null}
          </div>
        </section>
        <PotentialMeter value={material.recyclePotential} />
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3">
          <h4 className="font-display text-xl text-deep-blue">
            {t.result.ideasTitle(ideas.length)}
          </h4>
          <div
            role="group"
            aria-label={t.result.filterLabel}
            className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none]"
          >
            {(["all", ...DIFFICULTIES] as const).map((value) => {
              const active = filter === value;
              const count =
                value === "all"
                  ? ideas.length
                  : ideas.filter((idea) => idea.difficulty === value).length;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(value)}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
                    active
                      ? "border-emerald-brand bg-emerald-brand text-charcoal"
                      : "border-hairline bg-soft-white text-deep-blue hover:bg-mint-mist",
                  )}
                >
                  {active ? (
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-canary" />
                  ) : null}
                  {value === "all" ? t.result.filterAll : t.difficulty[value]} ({count})
                </button>
              );
            })}
          </div>
        </div>
        {visible.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visible.map((idea) => (
              <li key={idea.id} className="min-w-0">
                <IdeaCard idea={idea} conversationId={actions.conversationId} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-mint-mist p-4 text-sm text-deep-blue">{t.result.noIdeas}</p>
        )}
      </section>

      {kit ? (
        <section className="space-y-3 rounded-2xl bg-mint-mist/60 p-3 sm:p-4">
          <h4 className="font-display text-lg text-deep-blue">{t.result.kitTitle}</h4>
          <KitChip kit={kit} />
          <p className="flex gap-2 text-xs leading-relaxed text-deep-blue">
            <FiHeart aria-hidden="true" size={13} className="mt-0.5 shrink-0 text-emerald-ink" />
            {t.kit.community}
          </p>
        </section>
      ) : null}
      <WorkshopLink />
    </article>
  );
}

export function PotentialMeter({ value }: { value: number }) {
  return (
    <section className="rounded-2xl border border-hairline bg-soft-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-semibold text-deep-blue">{t.result.potentialTitle}</h4>
        <p className="font-display text-2xl text-emerald-ink">
          {value}
          <span className="text-sm text-charcoal/50">/100</span>
        </p>
      </div>
      <div
        role="meter"
        aria-label={t.result.potentialTitle}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-mint-mist"
      >
        <div className="h-full rounded-full bg-emerald-brand" style={{ width: `${value}%` }} />
      </div>
      <p className="mt-2 text-xs text-charcoal/60">{t.result.potentialHint}</p>
    </section>
  );
}

const PICK_MESSAGE: Record<PickReason, string> = {
  offline: t.picker.offline,
  unknown: t.picker.unknown,
  failed: t.picker.failed,
  timeout: t.picker.timeout,
  network: t.picker.network,
  rate_limited: t.picker.rateLimited,
};

/**
 * The safety net when a photo gave no material (unknown, failure, timeout, offline
 * demo): pick one by hand, or try a sample. Offline is information, not an error.
 */
export function PickerCard({
  reason,
  catalog,
  actions,
}: {
  reason: PickReason;
  catalog: Catalog;
  actions: CardActions;
}) {
  const calm = reason === "offline";
  const Icon = calm ? FiInfo : FiAlertTriangle;
  return (
    <article className={CARD}>
      <p
        className={cn(
          "flex gap-2.5 rounded-2xl px-4 py-3 text-sm leading-relaxed",
          calm ? "bg-mint-mist text-deep-blue" : "border border-canary bg-canary/15 text-charcoal",
        )}
      >
        <Icon aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-deep-blue" />
        {PICK_MESSAGE[reason]}
      </p>
      {actions.disabled ? null : (
        <>
          <section>
            <h4 className="mb-3 font-display text-lg text-deep-blue">{t.picker.title}</h4>
            <MaterialChips
              materials={catalog.materials}
              layout="grid"
              onPick={(id) => actions.onPickMaterial(id)}
            />
          </section>
          <section>
            <h4 className="mb-3 font-display text-lg text-deep-blue">{t.picker.orSamples}</h4>
            <SampleGallery materials={catalog.materials} onPick={actions.onPickSample} />
          </section>
        </>
      )}
    </article>
  );
}

/** Hazardous items: a polite refusal and general advice, never a DIY guide. */
export function HazardCard({ data }: { data: AgentDataTypes["hazard"] }) {
  return (
    <article className={CARD}>
      <div>
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-canary bg-canary/20 px-3 py-1 text-xs font-semibold text-charcoal">
          <FiAlertTriangle aria-hidden="true" size={13} />
          {t.hazard.kinds[data.result.safetyFlags.hazardKind]}
        </span>
        <h3 className="font-display text-2xl leading-tight text-deep-blue">{t.hazard.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{t.hazard.body}</p>
      </div>
      <section className="rounded-2xl bg-mint-mist p-4">
        <h4 className="mb-3 flex items-center gap-2 font-semibold text-deep-blue">
          <FiShield aria-hidden="true" size={16} className="text-emerald-ink" />
          {t.hazard.tipsTitle}
        </h4>
        <ul className="space-y-2 text-sm leading-relaxed text-charcoal/85">
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
      <p className="text-sm text-charcoal/70">{t.hazard.anotherHint}</p>
    </article>
  );
}
