import { type DynamicModule, Module, type Provider } from "@nestjs/common";

import { SERVICE_CONFIG } from "@lavieco/service-kit";

import type { ProgramEnv } from "../../config/env";
import {
  DisabledPaymentGateway,
  ORDER_SETTLEMENT_SERVICE,
  PAYMENT_GATEWAY,
  type OrderSettlementService,
  type PaymentGateway,
} from "../orders";
import { PaymentWebhooksController } from "./api/payment-webhooks.controller";
import { PayosWebhookService } from "./application/payos-webhook-service";
import { PayosGateway } from "./infrastructure/payos-gateway";
import { PAYOS_WEBHOOK_SERVICE } from "./payments.tokens";

/** payOS credentials from the environment, or null when payOS is not configured. */
export function payosCredentials(env: ProgramEnv) {
  const { PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY } = env;
  if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY) return null;
  return { clientId: PAYOS_CLIENT_ID, apiKey: PAYOS_API_KEY, checksumKey: PAYOS_CHECKSUM_KEY };
}

/**
 * `PAYMENT_GATEWAY` for the orders module: payOS when its three keys are set,
 * otherwise disabled (free events only; paid ones answer `payment.unavailable`).
 */
export const payosGatewayProvider: Provider = {
  provide: PAYMENT_GATEWAY,
  useFactory: (env: ProgramEnv): PaymentGateway => {
    const credentials = payosCredentials(env);
    return credentials ? new PayosGateway(credentials) : new DisabledPaymentGateway();
  },
  inject: [SERVICE_CONFIG],
};

/** payOS webhook (ADR-0015). Settlement itself belongs to the orders module. */
@Module({})
export class PaymentsModule {
  static forRoot(orders: DynamicModule): DynamicModule {
    return {
      module: PaymentsModule,
      imports: [orders],
      controllers: [PaymentWebhooksController],
      providers: [
        {
          provide: PAYOS_WEBHOOK_SERVICE,
          useFactory: (gateway: PaymentGateway, settlement: OrderSettlementService) =>
            new PayosWebhookService(gateway, settlement),
          inject: [PAYMENT_GATEWAY, ORDER_SETTLEMENT_SERVICE],
        },
      ],
    };
  }
}
