"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { FiClock, FiExternalLink, FiSave, FiSend } from "react-icons/fi";

import {
  HANDBOOK_LIMITS,
  type HandbookImportJob,
  type HandbookOverview,
  type HandbookVersion,
} from "@lavieco/shared/content";
import { Button, FormAlert, useToast } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import {
  discardDraft,
  publishDraft,
  reloadHandbook,
  saveStructure,
  startDraft,
} from "../actions/handbook";
import { TEXT } from "../constants/text";
import { useHandbookImport } from "../hooks/use-handbook-import";
import type { HandbookAbilities, HandbookFailure } from "../types";
import {
  addChapter,
  movePageTo,
  pageNumbers,
  removeChapter,
  removeCover,
  removePage,
  reorderChapters,
  reorderPages,
  sameStructure,
  structureOf,
  toStructureUpdate,
  updateChapter,
  type StructureState,
} from "../utils/structure";
import { ChapterBoard } from "./chapter-board";
import { CoversPanel } from "./covers-panel";
import { HandbookHeader } from "./handbook-header";
import { NotePanel } from "./note-panel";
import { PageInspector, type InspectorFocus } from "./page-inspector";
import { ImportStatus, UploadZone } from "./upload-zone";

const t = TEXT.vi;

const errorText = (reason: HandbookFailure, detail?: string) =>
  reason === "publish_blocked" && (detail === "no_pages" || detail === "empty_chapter")
    ? t.publish.blocked[detail]
    : t.errors[reason];

/** `/handbook`: the whole editing screen (06-admin layout, adapted to the admin shell). */
export function HandbookManager({
  initial,
  activeJob,
  abilities,
}: {
  initial: HandbookOverview;
  activeJob: HandbookImportJob | null;
  abilities: HandbookAbilities;
}) {
  const toast = useToast();
  const [overview, setOverview] = useState(initial);
  const draft = overview.draft;
  const [structure, setStructure] = useState<StructureState | null>(
    draft ? structureOf(draft) : null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(draft?.pages[0]?.id ?? null);
  const [focus, setFocus] = useState<InspectorFocus>(null);
  const [pageDirty, setPageDirty] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canWrite = abilities.write && draft !== null;

  /** A new version from the server: the structure follows unless the editor has unsaved changes. */
  const applyVersion = useCallback((version: HandbookVersion, force = false) => {
    setOverview((current) => ({ ...current, draft: version }));
    setStructure((current) => (force || current === null ? structureOf(version) : current));
  }, []);

  const reload = useCallback(async () => {
    const result = await callAction(() => reloadHandbook());
    if (result.status !== "ok") return;
    setOverview(result.data);
    setStructure(result.data.draft ? structureOf(result.data.draft) : null);
  }, []);

  const imports = useHandbookImport(
    useCallback(() => void reload(), [reload]),
    activeJob,
  );

  const pagesById = useMemo(
    () => new Map((draft?.pages ?? []).map((page) => [page.id, page])),
    [draft],
  );
  const numbers = useMemo(
    () => (structure ? pageNumbers(structure) : new Map<string, number>()),
    [structure],
  );
  const ordered = useMemo(() => [...numbers.keys()], [numbers]);
  const structureDirty =
    draft !== null && structure !== null && !sameStructure(structure, structureOf(draft));

  const run = async <T,>(
    action: () => Promise<
      { status: "ok"; data: T } | { status: "error"; reason: string; detail?: string }
    >,
    onOk: (data: T) => void,
  ) => {
    setBusy(true);
    setError(null);
    const result = await callAction(action);
    setBusy(false);
    if (result.status === "ok") {
      onOk(result.data);
      return true;
    }
    const reason = (result.reason in t.errors ? result.reason : "unavailable") as HandbookFailure;
    setError(errorText(reason, "detail" in result ? result.detail : undefined));
    return false;
  };

  const saveDraft = () =>
    draft && structure
      ? run(
          () => saveStructure(toStructureUpdate(structure, draft.revision)),
          (version) => {
            applyVersion(version, true);
            toast({ tone: "success", message: t.actions.saved });
          },
        )
      : Promise.resolve(true);

  const publish = async (note: string) => {
    if (structureDirty && !(await saveDraft())) return;
    const latest = await callAction(() => reloadHandbook());
    const revision = latest.status === "ok" ? latest.data.draft?.revision : draft?.revision;
    if (!revision) return;
    await run(
      () => publishDraft({ revision, note }),
      async (result) => {
        setPublishing(false);
        toast({ tone: "success", message: t.publish.done(result.version.number) });
        await reload();
      },
    );
  };

  const selectPage = (pageId: string, nextFocus: InspectorFocus) => {
    if (pageDirty && pageId !== selectedId && !window.confirm(t.inspector.dirty)) return;
    setSelectedId(pageId);
    setFocus(nextFocus);
  };

  const selected = selectedId ? (pagesById.get(selectedId) ?? null) : null;
  const selectedIndex = selectedId ? ordered.indexOf(selectedId) : -1;
  const choices = ordered.map((id) => ({
    id,
    label: t.board.pageLabel(numbers.get(id) ?? 0, pagesById.get(id)?.title ?? ""),
  }));
  const lowText =
    draft !== null &&
    draft.pages.length > 0 &&
    draft.pages.filter((page) => !page.missingText).length / draft.pages.length <
      HANDBOOK_LIMITS.lowTextRatio;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <HandbookHeader
        current="manage"
        draftNumber={draft?.number ?? null}
        publishedNumber={overview.publishedNumber}
        actions={
          draft ? (
            <>
              <Button
                as="a"
                href="/handbook/preview"
                target="_blank"
                rel="noopener"
                variant="secondary"
                size="sm"
              >
                <FiExternalLink aria-hidden="true" size={14} />
                {t.actions.preview}
              </Button>
              {abilities.write ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy || !structureDirty}
                  onClick={() => void saveDraft()}
                >
                  <FiSave aria-hidden="true" size={14} />
                  {t.actions.save}
                </Button>
              ) : null}
              {abilities.publish ? (
                <Button type="button" size="sm" disabled={busy} onClick={() => setPublishing(true)}>
                  <FiSend aria-hidden="true" size={14} />
                  {t.actions.publish}
                </Button>
              ) : null}
            </>
          ) : abilities.write ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(
                  () => startDraft(),
                  (version) => applyVersion(version, true),
                )
              }
            >
              {t.actions.startDraft}
            </Button>
          ) : null
        }
      />

      {structureDirty ? (
        <p role="status" className="text-[13px] font-semibold text-deep-blue">
          {t.actions.unsaved}
        </p>
      ) : null}
      <FormAlert tone="error" message={error} surface="light" />

      {publishing && draft ? (
        <NotePanel
          heading={t.publish.heading}
          body={t.publish.body}
          confirmLabel={t.publish.confirm}
          warning={lowText ? t.publish.lowText : null}
          busy={busy}
          error={null}
          onConfirm={(note) => void publish(note)}
          onCancel={() => setPublishing(false)}
        />
      ) : null}

      {!draft ? (
        <section className="rounded-3xl border border-hairline bg-white p-6">
          <h2 className="font-display text-xl text-deep-blue">{t.noDraft.title}</h2>
          <p className="mt-2 max-w-2xl text-[14px] text-charcoal/75">
            {abilities.write ? t.noDraft.body : t.noDraft.readOnly}
          </p>
          <p className="mt-4">
            <Link
              href="/handbook/history"
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-emerald-ink"
            >
              <FiClock aria-hidden="true" size={15} />
              {t.nav.history}
            </Link>
          </p>
        </section>
      ) : (
        <>
          {canWrite ? (
            <UploadZone
              chapters={draft.chapters}
              hasPages={draft.pages.length > 0}
              busy={imports.busy || busy}
              onStart={(files, target) => void imports.start(files, target, draft.revision)}
            />
          ) : null}
          <ImportStatus state={imports.state} onClose={imports.reset} />

          {structure ? (
            <CoversPanel
              covers={draft.covers}
              keepCovers={structure.keepCovers}
              canWrite={canWrite}
              busy={imports.busy || busy}
              onUpload={(side, file) =>
                void imports.start(
                  [file],
                  { mode: side === "front" ? "cover_front" : "cover_back" },
                  draft.revision,
                )
              }
              onRemove={(side) => setStructure((s) => s && removeCover(s, side))}
            />
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0">
              {structure ? (
                <ChapterBoard
                  structure={structure}
                  pagesById={pagesById}
                  numbers={numbers}
                  selectedPageId={selectedId}
                  canWrite={canWrite}
                  onReorderChapters={(from, to) =>
                    setStructure((s) => s && reorderChapters(s, from, to))
                  }
                  onReorderPages={(chapterId, from, to) =>
                    setStructure((s) => s && reorderPages(s, chapterId, from, to))
                  }
                  onRenameChapter={(id, title) =>
                    setStructure((s) => s && updateChapter(s, id, { title }))
                  }
                  onTintChapter={(id, tint) =>
                    setStructure((s) => s && updateChapter(s, id, { tint }))
                  }
                  onKindChapter={(id, kind) =>
                    setStructure((s) => s && updateChapter(s, id, { kind }))
                  }
                  onRemoveChapter={(id) => setStructure((s) => s && removeChapter(s, id))}
                  onAddChapter={() =>
                    setStructure(
                      (s) =>
                        s &&
                        addChapter(
                          s,
                          crypto.randomUUID(),
                          t.board.newChapter(s.chapters.length + 1),
                        ),
                    )
                  }
                  actions={{
                    onSelect: selectPage,
                    onReplace: (pageId, file) =>
                      void imports.start([file], { mode: "replace_page", pageId }, draft.revision),
                    onMove: (pageId, chapterId) =>
                      setStructure((s) => s && movePageTo(s, pageId, chapterId)),
                    onRemove: (pageId) => {
                      setStructure((s) => s && removePage(s, pageId));
                      if (pageId === selectedId) setSelectedId(null);
                    },
                  }}
                />
              ) : null}
            </div>
            <aside className="min-w-0 rounded-3xl border border-hairline bg-white p-4 md:p-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto">
              {selected ? (
                <PageInspector
                  key={selected.id}
                  page={selected}
                  number={numbers.get(selected.id) ?? 0}
                  revision={draft.revision}
                  pages={choices}
                  canWrite={canWrite}
                  focus={focus}
                  onSaved={(version) => applyVersion(version)}
                  onDirtyChange={setPageDirty}
                  onPrevious={
                    selectedIndex > 0 ? () => selectPage(ordered[selectedIndex - 1]!, null) : null
                  }
                  onNext={
                    selectedIndex >= 0 && selectedIndex < ordered.length - 1
                      ? () => selectPage(ordered[selectedIndex + 1]!, null)
                      : null
                  }
                />
              ) : (
                <p className="text-[14px] text-charcoal/70">{t.inspector.empty}</p>
              )}
            </aside>
          </div>

          {abilities.write ? (
            <div className="border-t border-hairline pt-6">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(t.actions.discardConfirm)) return;
                  void run(
                    () => discardDraft(draft.revision),
                    () => void reload(),
                  );
                }}
              >
                {t.actions.discard}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
