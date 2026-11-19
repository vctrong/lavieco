import type { OutboxPort, TxContext } from "@lavieco/service-kit/ports";

import type { PriceItemRepository, SalesOrderRepository, StaffDirectory } from "./ports";
import { SALES_SHEET_SYNC_JOB, type SalesSheetQueue } from "./sales-jobs";
import { buildSheetTabs, type SheetTab } from "./sheet-export";

export interface SheetWriter {
  write(tabs: SheetTab[]): Promise<void>;
}

/**
 * Rewrites the read-only Google Sheet from MongoDB (ADR-0030). Changes only enqueue a
 * job (same transaction, the API never waits for Google); a burst of changes needs one
 * rewrite, so a job asked before the last rewrite started is skipped.
 */
export class SalesSheetSync {
  private lastStartedAt = 0;
  private running: Promise<void> | null = null;

  constructor(
    private readonly orders: SalesOrderRepository,
    private readonly priceItems: PriceItemRepository,
    private readonly staff: StaffDirectory,
    private readonly writer: SheetWriter,
  ) {}

  /** `requestedAt`: when the change happened; older than the last run = nothing to do. */
  async run(requestedAt: number, now = new Date()) {
    if (requestedAt < this.lastStartedAt) return "skipped" as const;
    if (this.running) await this.running.catch(() => undefined);
    if (requestedAt < this.lastStartedAt) return "skipped" as const;
    this.lastStartedAt = now.getTime();
    this.running = (async () => {
      const [orders, items] = await Promise.all([
        this.orders.listAllForExport(),
        this.priceItems.list(),
      ]);
      // Full staff names for the assignee dropdown; identity down only shortens the list.
      const staffNames = await this.staff
        .list()
        .then((staff) => staff.map((entry) => entry.name))
        .catch(() => []);
      await this.writer.write(buildSheetTabs(orders, items, now, staffNames));
    })();
    try {
      await this.running;
      return "written" as const;
    } catch (error) {
      // A failed rewrite must not hide the next request.
      this.lastStartedAt = 0;
      throw error;
    } finally {
      this.running = null;
    }
  }
}

/** Enqueues a rewrite in the caller's transaction (outbox, retried until it works). */
export function outboxSheetQueue(outbox: OutboxPort): SalesSheetQueue {
  return {
    queue: (tx: TxContext) =>
      outbox.enqueue(tx, { type: SALES_SHEET_SYNC_JOB, payload: { requestedAt: Date.now() } }),
  };
}
