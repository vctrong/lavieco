import { type DynamicModule, Global, Module } from "@nestjs/common";

import { SERVICE_CONFIG } from "@lavieco/service-kit";

import type { ContentEnv } from "../../config/env";
import { createIdentityStaffAlertSink } from "./infrastructure/identity-staff-alert-sink";
import { STAFF_ALERT_SINK, type StaffAlertSink } from "./staff-alerts.tokens";

/** Staff alerts by Web Push, delivered through identity-service (ADR-0027). */
@Global()
@Module({})
export class StaffAlertsModule {
  /** `sink` lets tests capture alerts instead of calling identity-service. */
  static forRoot(sink?: StaffAlertSink): DynamicModule {
    return {
      module: StaffAlertsModule,
      providers: [
        sink
          ? { provide: STAFF_ALERT_SINK, useValue: sink }
          : {
              provide: STAFF_ALERT_SINK,
              useFactory: (env: ContentEnv) =>
                createIdentityStaffAlertSink({
                  identityServiceUrl: env.IDENTITY_SERVICE_URL,
                  privateJwk: env.SERVICE_TOKEN_PRIVATE_JWK,
                }),
              inject: [SERVICE_CONFIG],
            },
      ],
      exports: [STAFF_ALERT_SINK],
    };
  }
}
