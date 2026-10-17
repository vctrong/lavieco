import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import type { Logger } from "@lavieco/observability";
import { LOGGER } from "@lavieco/service-kit";

import type { MediaService } from "../application/media-service";
import { MEDIA_SERVICE, MEDIA_SWEEPER_OPTIONS } from "../media.tokens";

export type MediaSweeperOptions = { run: boolean; intervalMs: number };

/**
 * Releases uploads that were never attached within 24 hours (ADR-0020). Runs inside
 * the service like the outbox worker; several instances are safe because a release
 * only applies to a record that is still pending.
 */
@Injectable()
export class PendingMediaSweeper implements OnModuleInit, OnApplicationShutdown {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(MEDIA_SERVICE) private readonly media: MediaService,
    @Inject(MEDIA_SWEEPER_OPTIONS) private readonly options: MediaSweeperOptions,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  onModuleInit() {
    if (!this.options.run) return;
    this.timer = setInterval(() => void this.sweepOnce(), this.options.intervalMs);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  async sweepOnce(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const released = await this.media.sweepPending(now);
      if (released > 0) this.logger.info("released abandoned uploads", { count: released });
      return released;
    } catch (error) {
      this.logger.warn("pending media sweep failed", {
        errorCode: error instanceof Error ? error.name : "unknown",
      });
      return 0;
    } finally {
      this.running = false;
    }
  }
}
