import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, mongo } from "mongoose";

import { currentRequestId, sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";

import type {
  AuditEvent,
  AuditRecorder,
  ExternalAuditEvent,
} from "../application/ports/audit-recorder.port";
import { AUDIT_EVENT_MODEL } from "./audit-event.model";

@Injectable()
export class MongoAuditRecorder implements AuditRecorder {
  constructor(@InjectModel(AUDIT_EVENT_MODEL) private readonly model: Model<unknown>) {}

  async record(event: AuditEvent, tx?: TxContext): Promise<void> {
    const requestId = currentRequestId();
    await this.model.create(
      [
        {
          at: new Date(),
          service: "identity-service",
          action: event.action,
          actor: event.actor,
          target: event.target ?? null,
          result: event.result,
          context: requestId ? { requestId } : null,
          meta: event.meta ?? {},
        },
      ],
      { session: sessionOf(tx) },
    );
  }

  async recordExternal(event: ExternalAuditEvent): Promise<void> {
    try {
      await this.model.create({
        sourceEventId: `${event.service}:${event.eventId}`,
        at: event.at,
        service: event.service,
        action: event.action,
        actor: {
          userId: event.actor.userId,
          ...(event.actor.email ? { email: event.actor.email } : {}),
          roles: event.actor.roles,
        },
        target: event.target,
        result: event.result,
        context: event.requestId ? { requestId: event.requestId } : null,
        meta: event.meta,
      });
    } catch (error) {
      // Already recorded by an earlier delivery of the same outbox job.
      if (error instanceof mongo.MongoServerError && error.code === 11000) return;
      throw error;
    }
  }
}
