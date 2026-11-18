"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { HandbookImportJob, HandbookImportMode } from "@lavieco/shared/content";

import { callAction } from "@/shared/call-action";

import { createImport, getImport } from "../actions/handbook";
import { TEXT } from "../constants/text";
import { checkHandbookFile, imageAspectIsOff, uploadHandbookFile } from "../utils/chunked-upload";

const u = TEXT.vi.upload;
const POLL_MS = 2_000;

export type ImportTarget = { mode: HandbookImportMode; chapterId?: string; pageId?: string };

export type ImportState =
  | { phase: "idle" }
  | { phase: "sending"; name: string; percent: number }
  | { phase: "processing"; job: HandbookImportJob }
  | { phase: "done"; job: HandbookImportJob; notes: string[] }
  | { phase: "failed"; message: string };

const finished = (job: HandbookImportJob) => job.status === "done" || job.status === "failed";

/**
 * Upload → import → progress, shared by the drop zone and "Thay trang". Files go up in
 * chunks, then the job runs in the background; its progress is polled every 2 seconds
 * and survives a page reload (the screen passes the job still running).
 */
export function useHandbookImport(onImported: () => void, initialJob: HandbookImportJob | null) {
  const [state, setState] = useState<ImportState>(
    initialJob && !finished(initialJob)
      ? { phase: "processing", job: initialJob }
      : { phase: "idle" },
  );
  const aspectNotes = useRef<string[]>([]);
  const onImportedRef = useRef(onImported);
  useEffect(() => {
    onImportedRef.current = onImported;
  }, [onImported]);
  /** Bumped to stop the current follow loop (unmount, or a newer job). */
  const generation = useRef(0);

  /** Polls one job every 2 seconds until it is finished. */
  const follow = useCallback(async (jobId: string) => {
    const mine = (generation.current += 1);
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      if (generation.current !== mine) return;
      const result = await callAction(() => getImport(jobId));
      if (generation.current !== mine) return;
      if (result.status !== "ok") continue;
      const job = result.data;
      if (!finished(job)) {
        setState({ phase: "processing", job });
        continue;
      }
      if (job.status === "failed") {
        setState({ phase: "failed", message: u.errors[job.error ?? "internal"] });
      } else {
        // One line per kind: a 48-page book without text must not list 48 lines.
        const pagesWith = (code: "aspect_off" | "missing_text") =>
          job.warnings.filter((w) => w.code === code).map((w) => w.page ?? 0);
        const missing = pagesWith("missing_text");
        const aspect = pagesWith("aspect_off");
        const notes = [
          ...aspectNotes.current,
          ...(aspect.length ? [u.warnings.aspect_off(aspect)] : []),
          ...(missing.length ? [u.warnings.missing_text(missing)] : []),
          ...(job.warnings.some((w) => w.code === "low_text_ratio")
            ? [u.warnings.low_text_ratio()]
            : []),
        ];
        setState({ phase: "done", job, notes });
      }
      onImportedRef.current();
      return;
    }
  }, []);

  // Resume once, for a job that was running when the screen opened.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !initialJob || finished(initialJob)) return;
    resumed.current = true;
    void follow(initialJob.id);
  }, [initialJob, follow]);

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  const start = useCallback(
    async (files: File[], target: ImportTarget, revision: number) => {
      if (files.length === 0) return;
      const checks = files.map(checkHandbookFile);
      const refused = checks.find((check) => !check.ok);
      if (refused && !refused.ok) {
        setState({
          phase: "failed",
          message: refused.reason === "type" ? u.errors.type : u.errors.too_large,
        });
        return;
      }
      const kinds = new Set(checks.map((check) => (check.ok ? check.kind : "image")));
      if (kinds.has("pdf") && files.length > 1) {
        setState({ phase: "failed", message: u.errors.mixed });
        return;
      }
      aspectNotes.current = [];
      const kind = kinds.has("pdf") ? "pdf" : "image";
      if (kind === "image") {
        for (const file of files) {
          if (await imageAspectIsOff(file)) aspectNotes.current.push(u.errors.aspect(file.name));
        }
      }

      const total = files.reduce((sum, file) => sum + file.size, 0);
      let sentBefore = 0;
      const uploadIds: string[] = [];
      for (const file of files) {
        setState({
          phase: "sending",
          name: file.name,
          percent: Math.round((sentBefore / total) * 100),
        });
        const outcome = await uploadHandbookFile(file, kind, (sent) =>
          setState({
            phase: "sending",
            name: file.name,
            percent: Math.round(((sentBefore + sent) / total) * 100),
          }),
        );
        if (!outcome.ok) {
          setState({
            phase: "failed",
            message:
              outcome.reason === "session_expired" ? TEXT.vi.errors.session_expired : u.errors.send,
          });
          return;
        }
        uploadIds.push(outcome.uploadId);
        sentBefore += file.size;
      }

      const created = await callAction(() => createImport({ revision, uploadIds, ...target }));
      if (created.status !== "ok") {
        const reason = created.reason as keyof typeof TEXT.vi.errors;
        setState({
          phase: "failed",
          message: TEXT.vi.errors[reason] ?? TEXT.vi.errors.unavailable,
        });
        return;
      }
      setState({ phase: "processing", job: created.data });
      void follow(created.data.id);
    },
    [follow],
  );

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, start, reset, busy: state.phase === "sending" || state.phase === "processing" };
}
