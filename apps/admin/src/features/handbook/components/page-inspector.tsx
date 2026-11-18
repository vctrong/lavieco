"use client";

import { useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiPlus, FiTrash2 } from "react-icons/fi";

import type { HandbookHotspot, HandbookPage, HandbookVersion } from "@lavieco/shared/content";
import { Button, FormAlert, TextField, TextareaField, cn, useToast } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { savePage } from "../actions/handbook";
import { TEXT } from "../constants/text";
import type { Rect } from "../utils/hotspot-geometry";
import { HotspotCanvas } from "./hotspot-canvas";
import { HotspotTargetFields, targetIsValid, type PageChoice } from "./hotspot-target-fields";

const t = TEXT.vi.inspector;

export type InspectorFocus = "text" | "hotspot" | null;

const DEFAULT_RECT: Rect = { x: 30, y: 40, w: 40, h: 15 };
const TEXT_FIELD_ID = "handbook-page-text";

/**
 * Right-hand panel: the page large, its hotspots drawn on it, its text and alt. Saves
 * this one page; the structure (order, chapters) is saved separately.
 */
export function PageInspector({
  page,
  number,
  revision,
  pages,
  canWrite,
  focus,
  onSaved,
  onDirtyChange,
  onPrevious,
  onNext,
}: {
  page: HandbookPage;
  number: number;
  revision: number;
  pages: PageChoice[];
  canWrite: boolean;
  focus: InspectorFocus;
  onSaved: (version: HandbookVersion) => void;
  onDirtyChange: (dirty: boolean) => void;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(page.title);
  const [alt, setAlt] = useState(page.alt);
  const [text, setText] = useState(page.text);
  const [hotspots, setHotspots] = useState<HandbookHotspot[]>(page.hotspots);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hotspotsRef = useRef<HTMLDivElement>(null);

  const dirty =
    title !== page.title ||
    alt !== page.alt ||
    text !== page.text ||
    JSON.stringify(hotspots) !== JSON.stringify(page.hotspots);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  useEffect(() => {
    if (focus === "text") document.getElementById(TEXT_FIELD_ID)?.focus();
    if (focus === "hotspot") hotspotsRef.current?.scrollIntoView({ block: "nearest" });
  }, [focus]);

  const selected = hotspots.find((spot) => spot.id === selectedId) ?? null;
  const targetPages = pages.filter((choice) => choice.id !== page.id);

  const create = (rect: Rect) => {
    const spot: HandbookHotspot = {
      id: crypto.randomUUID(),
      ...rect,
      label: t.defaultLabel,
      target: { type: "laviagent", prompt: "" },
    };
    setHotspots((current) => [...current, spot]);
    setSelectedId(spot.id);
  };

  const update = (id: string, change: Partial<HandbookHotspot>) =>
    setHotspots((current) =>
      current.map((spot) => (spot.id === id ? { ...spot, ...change } : spot)),
    );

  const save = async () => {
    if (hotspots.some((spot) => !spot.label.trim() || !targetIsValid(spot.target))) {
      setError(t.invalid);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await callAction(() =>
      savePage(page.id, { revision, title: title.trim() || page.title, alt, text, hotspots }),
    );
    setBusy(false);
    if (result.status === "ok") {
      toast({ tone: "success", message: t.pageSaved });
      onSaved(result.data);
      return;
    }
    setError(
      TEXT.vi.errors[result.reason as keyof typeof TEXT.vi.errors] ?? TEXT.vi.errors.unavailable,
    );
  };

  return (
    <section aria-labelledby="inspector-heading" className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-museum text-deep-blue/60">
            {t.heading}
          </p>
          <h2 id="inspector-heading" className="font-display text-xl text-deep-blue">
            {TEXT.vi.board.pageLabel(number, page.title)}
          </h2>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onPrevious ?? undefined}
            disabled={!onPrevious}
            aria-label={t.previous}
            className="grid size-11 place-items-center rounded-full text-deep-blue hover:bg-mint-mist disabled:opacity-40"
          >
            <FiChevronLeft aria-hidden="true" size={20} />
          </button>
          <button
            type="button"
            onClick={onNext ?? undefined}
            disabled={!onNext}
            aria-label={t.next}
            className="grid size-11 place-items-center rounded-full text-deep-blue hover:bg-mint-mist disabled:opacity-40"
          >
            <FiChevronRight aria-hidden="true" size={20} />
          </button>
        </div>
      </header>

      <HotspotCanvas
        publicId={page.image.publicId}
        alt={page.alt || page.title}
        width={page.image.width}
        height={page.image.height}
        hotspots={hotspots}
        selectedId={selectedId}
        disabled={!canWrite}
        onSelect={setSelectedId}
        onCreate={create}
        onChange={(id, rect) => update(id, rect)}
      />
      {canWrite ? <p className="text-[12.5px] text-charcoal/70">{t.drawHint}</p> : null}

      <div ref={hotspotsRef} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold uppercase tracking-museum text-deep-blue/70">
            {t.hotspots} ({hotspots.length})
          </h3>
          {canWrite ? (
            <button
              type="button"
              onClick={() => create(DEFAULT_RECT)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-emerald-ink hover:bg-mint-mist"
            >
              <FiPlus aria-hidden="true" size={16} />
              {TEXT.vi.board.menu.hotspot}
            </button>
          ) : null}
        </div>
        {hotspots.length === 0 ? (
          <p className="text-[13px] text-charcoal/65">{t.noHotspots}</p>
        ) : null}
        <ul className="space-y-2">
          {hotspots.map((spot, index) => (
            <li
              key={spot.id}
              className={cn(
                "rounded-2xl border p-3",
                spot.id === selectedId
                  ? "border-emerald-brand bg-mint-mist/50"
                  : "border-hairline bg-white",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedId(spot.id === selectedId ? null : spot.id)}
                  aria-expanded={spot.id === selectedId}
                  className="min-h-11 flex-1 truncate text-left text-[13.5px] font-semibold text-deep-blue"
                >
                  {index + 1}. {spot.label} · {t.types[spot.target.type]}
                </button>
                {canWrite ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHotspots((current) => current.filter((item) => item.id !== spot.id));
                      setSelectedId(null);
                    }}
                    aria-label={`${t.removeHotspot} ${index + 1}`}
                    className="grid size-11 place-items-center rounded-full text-error hover:bg-error/10"
                  >
                    <FiTrash2 aria-hidden="true" size={16} />
                  </button>
                ) : null}
              </div>
              {selected?.id === spot.id ? (
                <div className="mt-2 space-y-3">
                  <TextField
                    tone="light"
                    label={t.hotspotLabel}
                    value={spot.label}
                    maxLength={80}
                    required
                    disabled={!canWrite}
                    onChange={(event) => update(spot.id, { label: event.target.value })}
                  />
                  <HotspotTargetFields
                    target={spot.target}
                    pages={targetPages}
                    disabled={!canWrite}
                    onChange={(target) => update(spot.id, { target })}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <TextField
          tone="light"
          label={t.pageTitle}
          value={title}
          maxLength={120}
          disabled={!canWrite}
          onChange={(event) => setTitle(event.target.value)}
        />
        <TextField
          tone="light"
          label={t.alt}
          hint={t.altHint}
          value={alt}
          maxLength={200}
          disabled={!canWrite}
          onChange={(event) => setAlt(event.target.value)}
        />
        <TextareaField
          id={TEXT_FIELD_ID}
          tone="light"
          label={`${t.text} · ${t.textFrom[page.textSource]}`}
          hint={t.textHint(text.length)}
          value={text}
          rows={8}
          maxLength={8000}
          disabled={!canWrite}
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      <FormAlert tone="error" message={error} surface="light" />
      {canWrite ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void save()} disabled={busy || !dirty}>
            {t.savePage}
          </Button>
          {dirty ? <span className="text-[13px] text-charcoal/70">{t.dirty}</span> : null}
        </div>
      ) : null}
    </section>
  );
}
