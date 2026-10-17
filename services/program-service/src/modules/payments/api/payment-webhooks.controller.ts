import { Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import type { Logger } from "@lavieco/observability";
import { AllowServices, ApiZodResponse, LOGGER, ZodBody } from "@lavieco/service-kit";
import {
  payosWebhookBodySchema,
  payosWebhookResponseSchema,
  type PayosWebhookBody,
} from "@lavieco/shared/events";

import { PayosWebhookService } from "../application/payos-webhook-service";
import { PAYOS_WEBHOOK_SERVICE } from "../payments.tokens";

/**
 * payOS webhook as forwarded by `web` (`/api/payments/payos/webhook`): the service is
 * never on the Internet itself. A wrong signature answers 400; anything verified
 * answers 2xx so payOS stops retrying (including its sample when the URL is registered).
 */
@ApiTags("payments")
@Controller("internal/v1/payment-webhooks")
export class PaymentWebhooksController {
  constructor(
    @Inject(PAYOS_WEBHOOK_SERVICE) private readonly webhooks: PayosWebhookService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  @Post("payos")
  @HttpCode(200)
  @AllowServices("web")
  @ApiOperation({ summary: "payOS payment webhook (signature checked here, idempotent)" })
  @ApiZodResponse(200, payosWebhookResponseSchema)
  async payos(@ZodBody(payosWebhookBodySchema) body: PayosWebhookBody) {
    try {
      const outcome = await this.webhooks.handle(body);
      // Order code and outcome only: the payload holds the payer's name and account.
      this.logger.info("payos webhook", { orderCode: body.data.orderCode, outcome });
      return { received: true as const };
    } catch (error) {
      this.logger.warn("payos webhook refused", {
        orderCode: body.data.orderCode,
        errorCode: error instanceof Error ? error.name : "unknown",
      });
      throw error;
    }
  }
}
