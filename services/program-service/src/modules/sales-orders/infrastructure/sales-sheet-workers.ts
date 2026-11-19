import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import type { Logger } from "@lavieco/observability";
import { LOGGER, OutboxWorker } from "@lavieco/service-kit";

import { SALES_SHEET_SYNC_JOB } from "../application/sales-jobs";
import type { SalesSheetSync } from "../application/sales-sheet-sync";
import { SALES_SHEET_OPTIONS, SALES_SHEET_SYNC } from "../sales-orders.tokens";

export type SalesSheetOptions = { enabled: boolean; intervalMinutes: number };

/**
 * Google Sheet sync (ADR-0030): the outbox job after each change, and a periodic rewrite
 * as a safety net (the "cron"). Logs carry no cell value, only the outcome.
 */
@Injectable()
export class SalesSheetWorkers implements OnModuleInit, OnApplicationShutdown {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly worker: OutboxWorker,
    @Inject(SALES_SHEET_SYNC) private readonly sync: SalesSheetSync | null,
    @Inject(SALES_SHEET_OPTIONS) private readonly options: SalesSheetOptions,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  onModuleInit() {
    // Registered even when off, so queued jobs complete instead of piling up.
    this.worker.register(SALES_SHEET_SYNC_JOB, async (payload) => {
      if (!this.sync) return;
      const requestedAt = Number(payload.requestedAt) || Date.now();
      await this.sync.run(requestedAt);
    });
    if (this.sync && this.options.intervalMinutes > 0) {
      this.timer = setInterval(
        () => void this.runPeriodic(),
        this.options.intervalMinutes * 60_000,
      );
      this.timer.unref();
    }
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  private async runPeriodic() {
    try {
      await this.sync?.run(Date.now());
    } catch (error) {
      this.logger.warn("sales sheet periodic sync failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}
