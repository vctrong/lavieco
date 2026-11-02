"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { EventView } from "@lavieco/shared/events";

/** Blocks of the editor that save on their own. */
export const EDITOR_BLOCKS = ["details", "tickets", "form"] as const;
export type EditorBlock = (typeof EDITOR_BLOCKS)[number];
/** Saves the block; resolves false when it could not (the block shows why). */
export type BlockSaver = () => Promise<boolean>;

/** A save that never gets its refresh must not hang "Lưu rồi xem". */
const REFRESH_TIMEOUT_MS = 5_000;

/**
 * What the blocks tell the editor: which hold unsaved changes, and how to save them.
 * Saving waits for the refreshed event between blocks, because each save moves the
 * event's `revision` and the next block must send the new one (optimistic lock).
 */
export function useEditorBlocks(event: EventView) {
  const [dirtyBlocks, setDirtyBlocks] = useState<ReadonlySet<EditorBlock>>(new Set());
  const savers = useRef(new Map<EditorBlock, BlockSaver>());
  const waiting = useRef<Array<() => void>>([]);

  useEffect(() => {
    waiting.current.splice(0).forEach((resolve) => resolve());
  }, [event]);

  const setDirty = useCallback((block: EditorBlock, dirty: boolean) => {
    setDirtyBlocks((current) => {
      if (current.has(block) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(block);
      else next.delete(block);
      return next;
    });
  }, []);

  const register = useCallback((block: EditorBlock, saver: BlockSaver | null) => {
    if (saver) savers.current.set(block, saver);
    else savers.current.delete(block);
  }, []);

  const saveDirty = async (): Promise<boolean> => {
    for (const block of EDITOR_BLOCKS) {
      if (!dirtyBlocks.has(block)) continue;
      const refreshed = new Promise<void>((resolve) => {
        waiting.current.push(resolve);
        setTimeout(resolve, REFRESH_TIMEOUT_MS);
      });
      const saved = await savers.current.get(block)?.();
      if (!saved) return false;
      await refreshed;
    }
    return true;
  };

  return { dirtyBlocks, setDirty, register, saveDirty };
}

export type EditorBlockProps = {
  onDirtyChange?: (block: EditorBlock, dirty: boolean) => void;
  registerSaver?: (block: EditorBlock, saver: BlockSaver | null) => void;
};
