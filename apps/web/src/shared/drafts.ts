"use client";

import { useCallback, useEffect, useState } from "react";

import { createSessionDraftStore, useFormDraft, type DraftStore } from "@lavieco/ui";

/**
 * Drafts of the public forms. They hold personal data (name, phone, email), so they live in
 * sessionStorage (BR-06): a reload, a failed submit or a lost connection keeps the input,
 * and closing the tab removes it, so the next person on a shared computer sees nothing.
 * Consent boxes are never part of a draft: consent is given by a fresh click.
 */
/** Null on the server. Reads and writes may still throw (storage blocked): the hook copes. */
const PUBLIC_DRAFT_STORE: DraftStore | null =
  typeof window === "undefined" ? null : createSessionDraftStore("lavieco-form");

/** Everyone in one tab is the same visitor; the tab itself is the boundary. */
const VISITOR = "visitor";

type PublicDraftOptions<T> = Omit<
  Parameters<typeof useFormDraft<T>>[0],
  "store" | "owner" | "revision"
>;

/**
 * `useFormDraft` for public forms: there is no server copy to compete with, so a draft
 * found in this tab is put back at once, and `restored` tells the form to say so.
 */
export function usePublicDraft<T>(options: PublicDraftOptions<T>) {
  const [restored, setRestored] = useState(false);
  const { onRestore } = options;
  const draft = useFormDraft<T>({
    ...options,
    onRestore: useCallback(
      (values: T) => {
        onRestore(values);
        setRestored(true);
      },
      [onRestore],
    ),
    store: PUBLIC_DRAFT_STORE,
    owner: VISITOR,
    revision: null,
  });
  const { offer, restore } = draft;
  useEffect(() => {
    if (offer) restore();
  }, [offer, restore]);
  /** "Xoá và nhập lại": forget the draft; the form resets its own fields. */
  const { clear } = draft;
  const forget = useCallback(() => {
    clear();
    setRestored(false);
  }, [clear]);
  return { ...draft, restored, forget };
}
