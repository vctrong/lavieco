import { type DynamicModule, Global, Module } from "@nestjs/common";

import { OUTBOX_PORT, SERVICE_CONFIG } from "@lavieco/service-kit";
import type { OutboxPort } from "@lavieco/service-kit/ports";

import type { ProgramEnv } from "../../config/env";
import { AuditTrail } from "./application/audit-trail";
import { AUDIT_SINK, AUDIT_TRAIL, type AuditSink } from "./audit.tokens";
import { AuditJobHandler } from "./infrastructure/audit-job-handler";
import { createIdentityAuditSink } from "./infrastructure/identity-audit-sink";

/** Audit trail of sensitive program actions, delivered to identity-service (ADR-0021). */
@Global()
@Module({})
export class ProgramAuditModule {
  /** `sink` lets tests capture what would reach identity-service. */
  static forRoot(sink?: AuditSink): DynamicModule {
    return {
      module: ProgramAuditModule,
      providers: [
        {
          provide: AUDIT_TRAIL,
          useFactory: (outbox: OutboxPort) => new AuditTrail(outbox),
          inject: [OUTBOX_PORT],
        },
        sink
          ? { provide: AUDIT_SINK, useValue: sink }
          : {
              provide: AUDIT_SINK,
              useFactory: (env: ProgramEnv) =>
                createIdentityAuditSink({
                  identityServiceUrl: env.IDENTITY_SERVICE_URL,
                  privateJwk: env.SERVICE_TOKEN_PRIVATE_JWK,
                }),
              inject: [SERVICE_CONFIG],
            },
        AuditJobHandler,
      ],
      exports: [AUDIT_TRAIL],
    };
  }
}
