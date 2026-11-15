"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { draftKey, type DraftRecord, type DraftStore } from "./draft-store";

export type DraftStatus =
  | { kind: "idle" }
  /** Changed since the last write; the write follows a short pause in typing. */
  | { kind: "typing" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  /** The browser refused to store it (private mode, quota): say so, never "saved". */
  | { kind: "failed" }
  /** An older draft waits for "restore" or "discard"; nothing is written until then. */
  | { kind: "held" };

export type DraftOffer = {
  savedAt: number;
  /** The record changed on the server after this draft was started. */
  stale: boolean;
};

type UseFormDraftOptions<T> = {
  store: DraftStore | null;
  /** The signed-in person (or a fixed value for anonymous forms); null turns drafts off. */
  owner: string | null;
  form: string;
  /** Record id, or "new" for a create form. */
  record: string;
  values: T;
  /** Whether the form holds changes not saved to the server. */
  dirty: boolean;
  /** Current server `revision` of the record; null for a create form. */
  revision: number | null;
  onRestore: (values: T) => void;
  delayMs?: number;
  maxAgeMs?: number;
};

const DEFAULT_DELAY_MS = 800;
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Keeps unsaved form input in browser storage so a reload, a closed tab, a crash or a
 * failed submit never costs the user what they typed.
 *
 * - Writes after `delayMs` without changes, and at once when the tab is hidden or left.
 * - Writes are chained, so an older write can never land after a newer one.
 * - On load, a draft is OFFERED, never applied silently: the server copy may be newer
 *   (`stale`, shown in the offer). Only an explicit "restore" puts it back.
 * - `clear()` after a successful save.
 */
export function useFormDraft<T>({
  store,
  owner,
  form,
  record,
  values,
  dirty,
  revision,
  onRestore,
  delayMs = DEFAULT_DELAY_MS,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
}: UseFormDraftOptions<T>) {
  const enabled = Boolean(store && owner);
  const key = owner ? draftKey(owner, form, record) : "";

  const [status, setStatus] = useState<DraftStatus>({ kind: "idle" });
  const [offer, setOffer] = useState<DraftOffer | null>(null);
  /** Key whose stored draft has been read; nothing is written before that. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loaded = loadedKey === key;
  /** Values last handed to the store: anything else on screen is still "typing". */
  const [written, setWritten] = useState<T | null>(null);

  const found = useRef<DraftRecord<T> | null>(null);
  const latest = useRef(values);
  const currentRevision = useRef(revision);
  useEffect(() => {
    latest.current = values;
    currentRevision.current = revision;
  });
  const base = useRef<number | null>(revision);
  const wasDirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chain = useRef<Promise<void>>(Promise.resolve());
  /** Bumped by every write and by clear(): a stale answer must not change the status. */
  const generation = useRef(0);

  // Read the stored draft once per key, before anything is written over it.
  useEffect(() => {
    if (!enabled || !store) return undefined;
    let live = true;
    void (async () => {
      try {
        await store.prune(maxAgeMs);
        const stored = await store.get<T>(key);
        if (!live) return;
        found.current = stored;
        if (stored) {
          setOffer({
            savedAt: stored.savedAt,
            stale: stored.baseRevision !== currentRevision.current,
          });
          setStatus({ kind: "held" });
        }
      } catch {
        // No storage: the form still works, it just cannot keep a draft.
      }
      if (live) setLoadedKey(key);
    })();
    return () => {
      live = false;
    };
    // Only on a new key: `revision` moves after each save and must not reopen the offer,
    // hence read through a ref.
  }, [enabled, store, key, maxAgeMs]);

  const write = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    if (!store || !owner) return;
    const id = ++generation.current;
    const entry: DraftRecord<T> = {
      key,
      owner,
      values: latest.current,
      baseRevision: base.current,
      savedAt: Date.now(),
    };
    setWritten(entry.values);
    setStatus({ kind: "saving" });
    chain.current = chain.current
      .then(() => store.put(entry))
      .then(
        () => {
          if (generation.current === id) setStatus({ kind: "saved", at: entry.savedAt });
        },
        () => {
          if (generation.current === id) setStatus({ kind: "failed" });
        },
      );
  }, [store, owner, key]);

  // The revision the edits start from is the one on screen when the first change is made.
  useEffect(() => {
    if (dirty && !wasDirty.current) base.current = revision;
    wasDirty.current = dirty;
  }, [dirty, revision]);

  useEffect(() => {
    if (!enabled || !loaded || offer || !dirty) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(write, delayMs);
    return undefined;
  }, [enabled, loaded, offer, dirty, values, delayMs, write]);

  // Leaving or hiding the tab: write what is pending now, the timer may never fire.
  useEffect(() => {
    if (!enabled) return undefined;
    const flush = () => {
      if (timer.current !== undefined) write();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [enabled, write]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const restore = useCallback(() => {
    const stored = found.current;
    if (!stored) return;
    // The person chose this draft over the server copy (the banner said when it is
    // older), so it is now based on the revision on screen and can be saved.
    base.current = currentRevision.current;
    wasDirty.current = true;
    onRestore(stored.values);
    setWritten(stored.values);
    setOffer(null);
    setStatus({ kind: "saved", at: stored.savedAt });
  }, [onRestore]);

  const discard = useCallback(() => {
    found.current = null;
    setOffer(null);
    setStatus({ kind: "idle" });
    if (store) void store.remove(key).catch(() => undefined);
  }, [store, key]);

  /** After the server accepted the form: the draft has done its job. */
  const clear = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    generation.current += 1;
    found.current = null;
    setOffer(null);
    setStatus({ kind: "idle" });
    if (store) {
      chain.current = chain.current.then(() => store.remove(key)).catch(() => undefined);
    }
  }, [store, key]);

  const typing = enabled && loaded && !offer && dirty && values !== written;
  return {
    status: typing ? ({ kind: "typing" } as const) : status,
    offer,
    restore,
    discard,
    clear,
  };
}
