import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import type { Logger } from "@lavieco/observability";
import { LOGGER } from "@lavieco/service-kit";

import type { OrderExpiryService } from "../application/order-expiry-service";
import { ORDER_EXPIRY_OPTIONS, ORDER_EXPIRY_SERVICE } from "../orders.tokens";

export type OrderExpiryOptions = { run: boolean; intervalMs: number };

/**
 * Runs the hold expiry every minute inside the service, like the outbox worker. Safe
 * on several instances: every release is a conditional update (OrderExpiryService).
 */
@Injectable()
export class OrderExpiryScheduler implements OnModuleInit, OnApplicationShutdown {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(ORDER_EXPIRY_SERVICE) private readonly expiry: OrderExpiryService,
    @Inject(ORDER_EXPIRY_OPTIONS) private readonly options: OrderExpiryOptions,
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

  async runOnce(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const expired = await this.expiry.expireDue(now);
      if (expired > 0) this.logger.info("expired seat holds", { count: expired });
      return expired;
    } catch (error) {
      this.logger.warn("seat hold expiry failed", {
        errorCode: error instanceof Error ? error.name : "unknown",
      });
      return 0;
    } finally {
      this.running = false;
    }
  }
}
