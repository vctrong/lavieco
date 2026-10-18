import type { AuditEventIngestRequest } from "@lavieco/shared/identity";

import type { UserRepository } from "../../users";
import type { AuditRecorder } from "./ports/audit-recorder.port";

/**
 * Records audit events of other services (ADR-0021). They only know the actor's id;
 * the email is looked up here so their outbox never carries personal data.
 */
export class AuditIngestService {
  constructor(
    private readonly recorder: AuditRecorder,
    private readonly users: UserRepository,
  ) {}

  async ingest(service: string, input: AuditEventIngestRequest): Promise<void> {
    const actor = await this.users.findById(input.actor.userId);
    await this.recorder.recordExternal({
      eventId: input.eventId,
      service,
      at: new Date(input.at),
      action: input.action,
      actor: { userId: input.actor.userId, email: actor?.email ?? null, roles: input.actor.roles },
      target: input.target,
      result: input.result,
      requestId: input.requestId,
      meta: input.meta,
    });
  }
}
