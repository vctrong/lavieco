import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { currentRequestId, sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";

import type { AuditEvent, AuditRecorder } from "../application/ports/audit-recorder.port";
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
}
