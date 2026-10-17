import type { TxContext } from "@lavieco/service-kit/ports";
import type {
  EventForm,
  EventKind,
  EventListQuery,
  EventPricing,
  EventStatus,
  EventStatusCounts,
  PublicEventListQuery,
} from "@lavieco/shared/events";

import type { Actor, EventContent, EventRecord, StatusChange } from "../../domain/event";

export const EVENT_REPOSITORY = Symbol("EVENT_REPOSITORY");

export type NewEvent = EventContent & {
  kind: EventKind;
  slug: string;
  form: EventForm;
  pricing: EventPricing;
  createdBy: Actor;
};

/**
 * What a public query may return (S3): no online link, no authors, no form, no
 * revision. The repository projects these fields away at query time.
 */
export type PublicEventRecord = Omit<
  EventRecord,
  "onlineUrl" | "createdBy" | "updatedBy" | "form" | "revision" | "firstPublishedAt"
>;

export type Page<T> = { items: T[]; nextCursor: string | null };

export interface EventRepository {
  /** Throws `event.slug_taken` when the slug is already used by a live event. */
  insert(input: NewEvent, tx?: TxContext): Promise<EventRecord>;
  /** Live (not discarded) event, any status. */
  findById(id: string, tx?: TxContext): Promise<EventRecord | null>;
  /** Slugs of live events equal to `base` or `base-<n>`. */
  usedSlugs(base: string): Promise<Set<string>>;
  updateContent(
    id: string,
    revision: number,
    changes: { content: EventContent; slug: string },
    actor: Actor,
    tx?: TxContext,
  ): Promise<EventRecord | null>;
  updateForm(
    id: string,
    revision: number,
    form: EventForm,
    actor: Actor,
    tx?: TxContext,
  ): Promise<EventRecord | null>;
  changeStatus(
    id: string,
    revision: number,
    change: {
      to: EventStatus;
      history: StatusChange;
      publishedAt: Date | null;
      firstPublish: boolean;
    },
    actor: Actor,
    tx?: TxContext,
  ): Promise<EventRecord | null>;
  /** Derived field: does not bump `revision`, so open admin forms stay valid. */
  setPricing(id: string, pricing: EventPricing, tx?: TxContext): Promise<void>;
  discard(id: string, revision: number, actor: Actor): Promise<boolean>;
  listAdmin(query: EventListQuery): Promise<Page<EventRecord> & { counts: EventStatusCounts }>;
  listPublic(query: PublicEventListQuery): Promise<Page<PublicEventRecord>>;
  /** Published, closed or ended only (S3). */
  findPublicBySlug(slug: string): Promise<PublicEventRecord | null>;
}
