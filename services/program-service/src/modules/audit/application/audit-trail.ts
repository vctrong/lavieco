import { randomUUID } from "node:crypto";

import type { OutboxPort, TxContext } from "@lavieco/service-kit/ports";
import type { Role } from "@lavieco/shared/permissions";

/** Outbox job delivering one audit event to identity-service (ADR-0021). */
export const AUDIT_RECORD_JOB = "audit.record";

/** Sensitive actions of program-service (docs/02 §9.7). `<object>.<action>`. */
export type ProgramAuditAction = "registration.export" | "order.refund";

export type AuditEntry = {
  action: ProgramAuditAction;
  actor: { userId: string; roles: readonly Role[] };
  target: { type: string; id: string };
  requestId: string | null;
  /** Counts and codes only, never personal data. */
  meta: Record<string, string | number | boolean>;
};

/**
 * Records an audit event in the caller's transaction: the outbox delivers it to
 * identity-service, so the trail survives identity being down. The payload holds ids
 * and codes only (CLAUDE §10); identity fills in the actor's email.
 */
export class AuditTrail {
  constructor(private readonly outbox: OutboxPort) {}

  record(tx: TxContext, entry: AuditEntry, at = new Date()): Promise<void> {
    return this.outbox.enqueue(tx, {
      type: AUDIT_RECORD_JOB,
      payload: {
        eventId: randomUUID(),
        at: at.toISOString(),
        action: entry.action,
        actorUserId: entry.actor.userId,
        actorRoles: entry.actor.roles.join(","),
        targetType: entry.target.type,
        targetId: entry.target.id,
        requestId: entry.requestId,
        meta: JSON.stringify(entry.meta),
      },
    });
  }
}
