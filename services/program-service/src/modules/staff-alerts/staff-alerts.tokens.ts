import type { PushNotificationRequest } from "@lavieco/shared/identity";

export const STAFF_ALERT_SINK = Symbol("STAFF_ALERT_SINK");

/**
 * Where staff alerts go: identity-service fans them out by Web Push (ADR-0027). Called
 * only from outbox handlers, so a failure is retried and never blocks an order.
 */
export interface StaffAlertSink {
  send(alert: PushNotificationRequest): Promise<void>;
}
