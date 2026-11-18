import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import type { Logger } from "@lavieco/observability";
import { LOGGER } from "@lavieco/service-kit";

import type { HandbookEditor } from "../application/handbook-editor";
import type { HandbookImports } from "../application/handbook-imports";
import { HANDBOOK_EDITOR, HANDBOOK_IMPORTS, HANDBOOK_WORKER_OPTIONS } from "../handbook.tokens";

export type HandbookWorkerOptions = {
  /** Off in tests that drive `tick`/`housekeep` themselves. */
  run: boolean;
  pollIntervalMs: number;
  housekeepingIntervalMs: number;
};

const errorCode = (error: unknown) => (error instanceof Error ? error.name : "unknown");

/**
 * Background work of the handbook, inside the service like the outbox worker:
 * imports run one at a time (a 2 vCPU server must keep serving), and every few hours
 * unused page images and stale upload files are cleaned up (ADR-0029). Several
 * instances are safe: a job is leased before it runs.
 */
@Injectable()
export class HandbookWorker implements OnModuleInit, OnApplicationShutdown {
  private poll: NodeJS.Timeout | null = null;
  private housekeeping: NodeJS.Timeout | null = null;
  private busy = false;

  constructor(
    @Inject(HANDBOOK_IMPORTS) private readonly imports: HandbookImports,
    @Inject(HANDBOOK_EDITOR) private readonly editor: HandbookEditor,
    @Inject(HANDBOOK_WORKER_OPTIONS) private readonly options: HandbookWorkerOptions,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  onModuleInit() {
    if (!this.options.run) return;
    this.poll = setInterval(() => void this.tick(), this.options.pollIntervalMs);
    this.poll.unref();
    this.housekeeping = setInterval(
      () => void this.housekeep(),
      this.options.housekeepingIntervalMs,
    );
    this.housekeeping.unref();
  }

  onApplicationShutdown() {
    if (this.poll) clearInterval(this.poll);
    if (this.housekeeping) clearInterval(this.housekeeping);
  }

  /** Runs queued imports until the queue is empty. */
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      while (await this.imports.runNext()) {
        this.logger.info("handbook import finished");
      }
    } catch (error) {
      this.logger.error("handbook import failed", { errorCode: errorCode(error) });
    } finally {
      this.busy = false;
    }
  }

  async housekeep(now = new Date()) {
    try {
      const released = await this.editor.cleanupMedia(now);
      const removed = await this.imports.sweepUploads(now);
      if (released + removed > 0) {
        this.logger.info("handbook cleanup", { releasedImages: released, removedFiles: removed });
      }
    } catch (error) {
      this.logger.warn("handbook cleanup failed", { errorCode: errorCode(error) });
    }
  }
}
