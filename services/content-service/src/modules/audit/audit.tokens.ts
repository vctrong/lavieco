import type { AuditEventIngestRequest } from "@lavieco/shared/identity";

export const AUDIT_TRAIL = Symbol("AUDIT_TRAIL");
export const AUDIT_SINK = Symbol("AUDIT_SINK");

/** Where audit events end up: identity-service's audit log (ADR-0021). */
export interface AuditSink {
  send(event: AuditEventIngestRequest): Promise<void>;
}
