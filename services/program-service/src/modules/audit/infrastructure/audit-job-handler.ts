import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";

import { OutboxWorker } from "@lavieco/service-kit";
import { auditEventIngestRequestSchema } from "@lavieco/shared/identity";

import { AUDIT_RECORD_JOB } from "../application/audit-trail";
import { AUDIT_SINK, type AuditSink } from "../audit.tokens";

/** Delivers `audit.record` jobs to identity-service; retried by the outbox until it answers. */
@Injectable()
export class AuditJobHandler implements OnModuleInit {
  constructor(
    private readonly worker: OutboxWorker,
    @Inject(AUDIT_SINK) private readonly sink: AuditSink,
  ) {}

  onModuleInit() {
    this.worker.register(AUDIT_RECORD_JOB, async (payload) => {
      const event = auditEventIngestRequestSchema.parse({
        eventId: payload.eventId,
        at: payload.at,
        action: payload.action,
        actor: {
          userId: payload.actorUserId,
          roles: String(payload.actorRoles).split(",").filter(Boolean),
        },
        target: { type: payload.targetType, id: payload.targetId },
        result: "success",
        requestId: payload.requestId ?? null,
        meta: JSON.parse(String(payload.meta)) as unknown,
      });
      await this.sink.send(event);
    });
  }
}
