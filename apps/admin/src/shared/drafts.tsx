"use client";

import { createContext, useContext, type ReactNode } from "react";

import { createIndexedDbDraftStore, useFormDraft, type DraftStore } from "@lavieco/ui";

/**
 * Drafts of the staff editors: IndexedDB, keyed by the signed-in staff id, so a long
 * editor survives a reload, a closed tab or an expired session, and one person's input
 * never shows up under another account on the same computer.
 */
const DraftOwnerContext = createContext<string | null>(null);

export function DraftOwnerProvider({ owner, children }: { owner: string; children: ReactNode }) {
  return <DraftOwnerContext.Provider value={owner}>{children}</DraftOwnerContext.Provider>;
}

/** Null on the server; the database itself is only opened on first use. */
const STAFF_DRAFT_STORE: DraftStore | null =
  typeof indexedDB === "undefined" ? null : createIndexedDbDraftStore("lavieco-admin-drafts");

type StaffDraftOptions<T> = Omit<Parameters<typeof useFormDraft<T>>[0], "store" | "owner">;

/** `useFormDraft` with the staff store and owner filled in. */
export function useStaffDraft<T>(options: StaffDraftOptions<T>) {
  const owner = useContext(DraftOwnerContext);
  return useFormDraft<T>({ ...options, store: STAFF_DRAFT_STORE, owner });
}
