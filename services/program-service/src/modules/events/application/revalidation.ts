import type { OutboxPort, TxContext } from "@lavieco/service-kit/ports";

import { isPublicStatus, type EventRecord } from "../domain/event";

/** Outbox job asking `web` to drop the cached list and the page of one event. */
export const REVALIDATE_EVENT_JOB = "web.revalidate_event";

/**
 * Queues a revalidation when the public site can see (or could just see) the event.
 * Same transaction as the change (S5); the payload is the slug only, no personal data.
 */
export async function queueRevalidation(
  outbox: OutboxPort,
  tx: TxContext,
  event: Pick<EventRecord, "slug" | "status">,
  options: { force?: boolean } = {},
): Promise<void> {
  if (!options.force && !isPublicStatus(event.status)) return;
  await outbox.enqueue(tx, { type: REVALIDATE_EVENT_JOB, payload: { slug: event.slug } });
}
