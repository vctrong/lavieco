"use client";

import { useMemo, useState } from "react";
import { FiAlertTriangle, FiCamera, FiEdit2 } from "react-icons/fi";

import { Eyebrow, cn } from "@lavieco/ui";

import { LaviAgentMascot } from "@/shared/components/illustrations/laviagent-mascot";

import { MATERIAL_ICONS } from "../constants/icons";
import { TEXT } from "../constants/text";
import { useAgentChat } from "../hooks/use-agent-chat";
import type { FlowImage, ResultSource } from "../hooks/use-agent-flow";
import { DIFFICULTIES } from "../schemas";
import type { Catalog, ClassifyResult, Difficulty, Material } from "../types";
import { ChatPanel } from "./chat/chat-panel";
import { ChatSheet } from "./chat/chat-sheet";
import { IdeaCard } from "./idea-card";
import { KitCard } from "./kit-card";
import { PhotoFrame } from "./photo-screens";
import { BAR_BUTTON, BAR_PRIMARY, BAR_SECONDARY, BOTTOM_BAR } from "./styles";
import { WorkshopLink } from "./workshop-link";

const t = TEXT.vi;

type ResultScreenProps = {
  catalog: Catalog;
  material: Material;
  image: FlowImage | null;
  result: ClassifyResult | null;
  source: ResultSource;
  onCorrect: () => void;
  onReset: () => void;
};

export function ResultScreen({
  catalog,
  material,
  image,
  result,
  source,
  onCorrect,
  onReset,
}: ResultScreenProps) {
  const [filter, setFilter] = useState<Difficulty | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const { chat, ask } = useAgentChat({ material: material.id });

  const ideas = useMemo(
    () => catalog.ideas.filter((idea) => idea.material === material.id),
    [catalog.ideas, material.id],
  );
  const visible = filter === "all" ? ideas : ideas.filter((idea) => idea.difficulty === filter);
  const kit = useMemo(() => {
    const kitId = ideas.find((idea) => idea.kitId)?.kitId;
    return catalog.kits.find((item) => item.id === kitId) ?? null;
  }, [catalog.kits, ideas]);

  const chatProps = { chat, ask, catalog, materialName: material.name };
  const Icon = MATERIAL_ICONS[material.icon];
  const shownImage: FlowImage = image ?? {
    kind: "sample",
    url: material.sample.image,
    alt: material.sample.alt,
  };

  return (
    <div className="pb-28 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10 lg:pb-0 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0">
        {/* Material card */}
        <section className="grid gap-6 rounded-[2rem] border border-hairline bg-soft-white p-5 shadow-ambient sm:grid-cols-[180px_minmax(0,1fr)] sm:p-6">
          <PhotoFrame
            image={shownImage}
            alt={image?.kind === "sample" ? image.alt : t.result.imageAlt(material.name)}
            size="sm"
          />
          <div className="min-w-0">
            <Eyebrow className="mb-2">
              {source === "sample"
                ? t.result.sourceSample
                : source === "manual"
                  ? t.result.sourceManual
                  : t.result.kicker}
            </Eyebrow>
            <p className="text-xs font-semibold uppercase tracking-museum text-charcoal/55">
              {t.result.detected}
            </p>
            <h1 className="mt-1 flex items-center gap-2.5 font-display text-3xl leading-tight text-deep-blue sm:text-4xl">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint-mist text-emerald-ink">
                <Icon aria-hidden="true" size={19} />
              </span>
              {material.name}
            </h1>
            {result ? (
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-charcoal/55">{t.result.shape}</dt>
                  <dd className="font-medium text-charcoal">{result.shape}</dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/55">{t.result.condition}</dt>
                  <dd className="font-medium text-charcoal">{result.condition}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-charcoal/75">
                {material.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {result ? (
                <span className="rounded-full bg-mint-mist px-3 py-1 text-xs font-semibold text-emerald-ink">
                  {t.result.confidence(result.confidence)}
                </span>
              ) : null}
              <button
                type="button"
                onClick={onCorrect}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-deep-blue underline-offset-4 hover:text-emerald-ink hover:underline"
              >
                <FiEdit2 aria-hidden="true" size={14} />
                {t.result.correct}
              </button>
            </div>
          </div>
        </section>

        {/* Safety + potential */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section className="flex gap-3 rounded-[1.5rem] border border-canary bg-canary/10 p-5">
            <FiAlertTriangle
              aria-hidden="true"
              size={18}
              className="mt-0.5 shrink-0 text-deep-blue"
            />
            <div>
              <h2 className="font-semibold text-deep-blue">{t.result.safetyTitle}</h2>
              <p className="mt-1 text-sm leading-relaxed text-charcoal/85">{material.safetyNote}</p>
              {result?.safetyFlags.sharpEdges ? (
                <p className="mt-2 text-sm font-medium text-charcoal">{t.result.sharpEdges}</p>
              ) : null}
            </div>
          </section>
          <PotentialMeter value={material.recyclePotential} />
        </div>

        {/* Ideas */}
        <section className="mt-12">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-3xl text-deep-blue">
              {t.result.ideasTitle(ideas.length)}
            </h2>
            <div
              role="group"
              aria-label={t.result.filterLabel}
              className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0"
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
            <ul className="grid gap-5 sm:grid-cols-2">
              {visible.map((idea) => (
                <li key={idea.id}>
                  <IdeaCard idea={idea} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-mint-mist p-5 text-sm text-deep-blue">
              {t.result.noIdeas}
            </p>
          )}
        </section>

        {/* KIT + workshop */}
        {kit ? (
          <section className="mt-12 grid gap-6 rounded-[2rem] bg-mint-mist/60 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
            <KitCard kit={kit} />
            <WorkshopLink />
          </section>
        ) : (
          <div className="mt-12">
            <WorkshopLink />
          </div>
        )}

        <button
          type="button"
          onClick={onReset}
          className="mt-10 hidden min-h-12 w-full items-center justify-center gap-2 rounded-full border border-deep-blue/20 text-sm font-semibold text-deep-blue transition-colors hover:bg-mint-mist md:flex"
        >
          <FiCamera aria-hidden="true" size={16} />
          {t.result.retry}
        </button>
      </div>

      {/* Desktop: the conversation stays beside the results. */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 h-[calc(100dvh-7.5rem)] overflow-hidden rounded-[2rem] border border-hairline shadow-ambient">
          <ChatPanel {...chatProps} className="h-full" />
        </div>
      </aside>

      {/* Phones and tablets: a bottom sheet opened from the thumb zone. */}
      <div className={cn(BOTTOM_BAR, "lg:hidden")}>
        <div className="mx-auto flex max-w-md gap-2">
          <button
            type="button"
            onClick={onReset}
            className={cn(BAR_BUTTON, BAR_SECONDARY, "flex-1")}
          >
            <FiCamera aria-hidden="true" size={16} />
            {t.result.retry}
          </button>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            className={cn(BAR_BUTTON, BAR_PRIMARY, "flex-1")}
          >
            <LaviAgentMascot variant="line" className="size-5" />
            {t.result.askAgent}
          </button>
        </div>
      </div>
      <ChatSheet {...chatProps} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

function PotentialMeter({ value }: { value: number }) {
  return (
    <section className="rounded-[1.5rem] border border-hairline bg-soft-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-deep-blue">{t.result.potentialTitle}</h2>
        <p className="font-display text-3xl text-emerald-ink">
          {value}
          <span className="text-base text-charcoal/50">/100</span>
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
