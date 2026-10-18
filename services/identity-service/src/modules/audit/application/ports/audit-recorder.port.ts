import type { TxContext } from "@lavieco/service-kit/ports";
import type { Role } from "@lavieco/shared/permissions";

export const AUDIT_RECORDER = Symbol("AUDIT_RECORDER");

/** Actions recorded by identity-service (docs/02 §9.7). `<object>.<action>`. */
export type AuditAction =
  | "staff.login"
  | "staff.second_factor"
  | "staff.recovery_code_used"
  | "staff.step_up"
  | "invitation.created"
  | "invitation.accepted"
  | "session.reuse_detected"
  | "member.password_reset";

export type AuditEvent = {
  action: AuditAction;
  actor: { userId: string | null; email?: string; roles?: Role[] } | null;
  target?: { type: string; id: string };
  result: "success" | "failure";
  /** Small and free of personal data (counts, reasons as codes). */
  meta?: Record<string, string | number | boolean>;
};

/**
 * Event written by another service through its outbox (ADR-0021). The action is
 * theirs (`registration.export`, `order.refund` ...); `at` is when it happened there.
 */
export type ExternalAuditEvent = {
  /** Sender's id for this event; a retried delivery is ignored. */
  eventId: string;
  service: string;
  at: Date;
  action: string;
  actor: { userId: string; email: string | null; roles: Role[] };
  target: { type: string; id: string } | null;
  result: "success" | "failure";
  requestId: string | null;
  meta: Record<string, string | number | boolean>;
};

/** Append-only audit trail (docs/03 §4.4). */
export interface AuditRecorder {
  record(event: AuditEvent, tx?: TxContext): Promise<void>;
  /** Idempotent on (`service`, `eventId`). */
  recordExternal(event: ExternalAuditEvent): Promise<void>;
}
