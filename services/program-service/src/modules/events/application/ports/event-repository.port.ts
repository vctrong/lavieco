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

import type {
  Actor,
  EventAttendance,
  EventCancellation,
  EventContent,
  EventRecord,
  StatusChange,
} from "../../domain/event";
import type { EventImages } from "../../domain/event-images";

export const EVENT_REPOSITORY = Symbol("EVENT_REPOSITORY");

export type NewEvent = EventContent & {
  /** From `newId()`: images are attached to the event before it is written. */
  id: string;
  images: EventImages;
  attendance: EventAttendance;
  kind: EventKind;
  slug: string;
  form: EventForm;
  pricing: EventPricing;
  createdBy: Actor;
};

/**
 * What a public query may return (S3): no online link (only whether one is set), no
 * authors, no form, no revision. The repository maps these away at query time.
 */
export type PublicEventRecord = Omit<
  EventRecord,
  "onlineUrl" | "createdBy" | "updatedBy" | "form" | "revision" | "firstPublishedAt"
> & { hasOnlineLink: boolean };

export type Page<T> = { items: T[]; nextCursor: string | null };

export type ContentChanges = {
  content: EventContent;
  slug: string;
  images: EventImages;
  attendance: EventAttendance;
};

export interface EventRepository {
  newId(): string;
  /** Throws `event.slug_taken` when the slug is already used by a live event. */
  insert(input: NewEvent, tx?: TxContext): Promise<EventRecord>;
  /** Live (not discarded) event, any status. */
  findById(id: string, tx?: TxContext): Promise<EventRecord | null>;
  /** Slugs of live events equal to `base` or `base-<n>`. */
  usedSlugs(base: string): Promise<Set<string>>;
  updateContent(
    id: string,
    revision: number,
    changes: ContentChanges,
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
      /** Only with `to: "cancelled"`. */
      cancellation?: EventCancellation;
    },
    actor: Actor,
    tx?: TxContext,
  ): Promise<EventRecord | null>;
  /** BR-09: approves the attendance count stored at this revision. */
  approveAttendance(
    id: string,
    revision: number,
    approval: { at: Date; by: string },
    actor: Actor,
    tx?: TxContext,
  ): Promise<EventRecord | null>;
  /** Derived field: does not bump `revision`, so open admin forms stay valid. */
  setPricing(id: string, pricing: EventPricing, tx?: TxContext): Promise<void>;
  discard(id: string, revision: number, actor: Actor, tx?: TxContext): Promise<boolean>;
  listAdmin(query: EventListQuery): Promise<Page<EventRecord> & { counts: EventStatusCounts }>;
  /** `now` splits upcoming from past by end time; `total` counts every page. */
  listPublic(
    query: PublicEventListQuery,
    now: Date,
  ): Promise<Page<PublicEventRecord> & { total: number }>;
  /** Published, closed, ended or cancelled only (S3). */
  findPublicBySlug(slug: string): Promise<PublicEventRecord | null>;
  /**
   * Same scope, full record (form, online link): used by the checkout and to tell the
   * public page whether registration is open. Never mapped to a public DTO as is.
   */
  findPublicFullBySlug(slug: string, tx?: TxContext): Promise<EventRecord | null>;
  /** Any event, discarded included (orders keep pointing at their event). */
  findByIds(ids: string[]): Promise<EventRecord[]>;
}
