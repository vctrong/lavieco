import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import type { Logger } from "@lavieco/observability";
import { LOGGER } from "@lavieco/service-kit";

import type { CampaignService } from "../application/campaign-service";
import { CAMPAIGN_SERVICE } from "../campaigns.tokens";
import { CAMPAIGN_OPTIONS } from "../application/campaign-service";

export type CampaignWorkerOptions = { run: boolean; intervalMs: number };

/** Runs the campaign queue every minute inside the service, like the seat hold expiry. */
@Injectable()
export class CampaignScheduler implements OnModuleInit, OnApplicationShutdown {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(CAMPAIGN_SERVICE) private readonly campaigns: CampaignService,
    @Inject(CAMPAIGN_OPTIONS) private readonly options: CampaignWorkerOptions,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  onModuleInit() {
    if (!this.options.run) return;
    this.timer = setInterval(() => void this.runOnce(), this.options.intervalMs);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const { sent, failed, skipped } = await this.campaigns.tick(now);
      if (sent + failed + skipped > 0) {
        this.logger.info("campaign emails processed", { sent, failed, skipped });
      }
    } catch (error) {
      this.logger.warn("campaign worker failed", {
        errorCode: error instanceof Error ? error.name : "unknown",
      });
    } finally {
      this.running = false;
    }
  }
}
