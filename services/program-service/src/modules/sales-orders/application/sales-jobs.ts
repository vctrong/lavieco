import type { TxContext } from "@lavieco/service-kit/ports";

/** Outbox job: rewrite the read-only Google Sheet from MongoDB (ADR-0030). */
export const SALES_SHEET_SYNC_JOB = "sales.sheet_sync";

/**
 * Asks for a Sheet refresh in the same transaction as the change, so the API never waits
 * for Google. A no-op when the sync is not configured.
 */
export interface SalesSheetQueue {
  queue(tx: TxContext): Promise<void>;
}

export const noSheetQueue: SalesSheetQueue = { queue: async () => undefined };
