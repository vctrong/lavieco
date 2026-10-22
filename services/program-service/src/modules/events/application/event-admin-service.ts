import { createHash, randomBytes } from "node:crypto";

import type { OutboxPort, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import type { Role } from "@lavieco/shared/permissions";
import {
  EVENT_LIMITS,
  type EventAttendanceApproveRequest,
  type EventCreateRequest,
  type EventForm,
  type EventFormUpdateRequest,
  type EventListQuery,
  type EventStatusChangeRequest,
  type EventUpdateRequest,
} from "@lavieco/shared/events";

import type { AuditTrail } from "../../audit";
import { isSelectable, type EventTypeRepository } from "../../event-types";
import type { TicketTypeRepository } from "../../ticketing";
import { assertOnlineLinkKept } from "../domain/online-link";
import { duplicateOf } from "../domain/duplicate";
import {
  NO_ATTENDANCE,
  nextAttendance,
  toEventContent,
  type Actor,
  type EventRecord,
} from "../domain/event";
import { nextStatus } from "../domain/event-lifecycle";
import { baseSlug, duplicateBaseSlug, firstFreeSlug } from "../domain/event-slug";
import {
  NO_IMAGES,
  imageIds,
  imagesInputOf,
  imagesOf,
  releasedImageIds,
} from "../domain/event-images";
import { assertFormChangeAllowed } from "../domain/form-rules";
import { queueImageRelease, resolveEventImages } from "./event-media";
import { snapshotOf, type EventSnapshot } from "./event-snapshot";
import type { EventRepository } from "./ports/event-repository.port";
import type { MediaAttachments } from "./ports/media-attachments.port";
import type { PreviewTokenRepository } from "./ports/preview-token-repository.port";
import { queueRevalidation } from "./revalidation";

const MINUTE_MS = 60_000;

export const hashPreviewToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * UC-32: write events, preview, publish without a second reviewer, close/end,
 * unpublish while nobody registered, duplicate (docs/05, BR-17).
 */
export class EventAdminService {
  constructor(
    private readonly events: EventRepository,
    private readonly ticketTypes: TicketTypeRepository,
    private readonly types: EventTypeRepository,
    private readonly previewTokens: PreviewTokenRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly media: MediaAttachments,
    private readonly audit: AuditTrail,
  ) {}

  async list(query: EventListQuery) {
    const page = await this.events.listAdmin(query);
    const ticketTypes = await this.ticketTypes.listByEvents(page.items.map((event) => event.id));
    return {
      ...page,
      items: page.items.map((event) => ({ event, ticketTypes: ticketTypes.get(event.id) ?? [] })),
    };
  }

  async get(id: string, now = new Date()): Promise<EventSnapshot> {
    const event = await this.requireEvent(id);
    return this.snapshot(event, now);
  }

  async create(input: EventCreateRequest, actor: Actor, now = new Date()) {
    await this.requireSelectableType(input.typeId);
    const slug = input.slug ?? (await this.freeSlug(baseSlug(input.title)));
    const id = this.events.newId();
    const images = await resolveEventImages(this.media, id, NO_IMAGES, imagesInputOf(input));
    const event = await this.events.insert({
      ...toEventContent(input, images.avatars),
      id,
      images,
      attendance: nextAttendance(input.kind, NO_ATTENDANCE, input.attendanceCount),
      kind: input.kind,
      slug,
      form: { questions: [] },
      pricing: { isFree: false, priceFrom: null },
      createdBy: actor,
    });
    return this.snapshot(event, now);
  }

  async updateDetails(id: string, input: EventUpdateRequest, actor: Actor, now = new Date()) {
    const current = await this.requireEvent(id);
    if (input.typeId !== current.typeId) await this.requireSelectableType(input.typeId);
    const slug = input.slug ?? current.slug;
    // The public URL (and QR codes printed for it) must never move once published.
    if (slug !== current.slug && current.firstPublishedAt !== null) {
      throw new DomainError("event.slug_locked");
    }
    if (current.revision !== input.revision) throw new DomainError("common.conflict");
    // A cancelled or ended event is a record of what happened: its page stays as is.
    if (current.status === "cancelled") throw new DomainError("event.invalid_transition");
    const sold = (await this.ticketTypes.listByEvent(id)).reduce((sum, type) => sum + type.sold, 0);
    assertOnlineLinkKept(current, toEventContent(input, []), sold);
    const before = imagesOf(current);
    const images = await resolveEventImages(this.media, id, before, imagesInputOf(input));
    const content = toEventContent(input, images.avatars);
    const attendance = nextAttendance(current.kind, current.attendance, input.attendanceCount);
    const updated = await this.unitOfWork.run(async (tx) => {
      const saved = await this.events.updateContent(
        id,
        input.revision,
        { content, slug, images, attendance },
        actor,
        tx,
      );
      if (!saved) throw new DomainError("common.conflict");
      // A replaced image or a photo taken out of the gallery is deleted (ADR-0020).
      await queueImageRelease(this.outbox, tx, id, releasedImageIds(before, images));
      await queueRevalidation(this.outbox, tx, saved);
      return saved;
    });
    return this.snapshot(updated, now);
  }

  async updateForm(id: string, input: EventFormUpdateRequest, actor: Actor, now = new Date()) {
    const current = await this.requireEvent(id);
    const ticketTypes = await this.ticketTypes.listByEvent(id);
    const next: EventForm = { questions: input.questions };
    assertFormChangeAllowed(current.form, next, {
      kind: current.kind,
      hasRegistrations: snapshotOf(current, ticketTypes, null, now).hasRegistrations,
    });
    const updated = await this.events.updateForm(id, input.revision, next, actor);
    if (!updated) throw new DomainError("common.conflict");
    return this.snapshot(updated, now);
  }

  async changeStatus(
    id: string,
    input: EventStatusChangeRequest,
    actor: Actor,
    now = new Date(),
  ): Promise<EventSnapshot> {
    const updated = await this.unitOfWork.run(async (tx) => {
      const current = await this.events.findById(id, tx);
      if (!current) throw new DomainError("common.not_found");
      if (current.revision !== input.revision) throw new DomainError("common.conflict");
      const ticketTypes = await this.ticketTypes.listByEvent(id, tx);
      const type = await this.types.findById(current.typeId);
      const { hasRegistrations, readiness } = snapshotOf(current, ticketTypes, type, now);
      const to = nextStatus(input.action, {
        kind: current.kind,
        status: current.status,
        hasRegistrations,
        readiness,
      });
      const saved = await this.events.changeStatus(
        id,
        input.revision,
        {
          to,
          history: { from: current.status, to, at: now, by: actor.userId },
          publishedAt: to === "draft" ? null : (current.publishedAt ?? now),
          firstPublish: current.firstPublishedAt === null && to !== "draft",
        },
        actor,
        tx,
      );
      if (!saved) throw new DomainError("common.conflict");
      // Also when going back to draft: the cached public page must disappear.
      await queueRevalidation(this.outbox, tx, saved, { force: true });
      return saved;
    });
    return this.snapshot(updated, now);
  }

  async duplicate(id: string, actor: Actor, now = new Date()) {
    const source = await this.requireEvent(id);
    const copy = duplicateOf(source, await this.ticketTypes.listByEvent(id));
    const slug = await this.freeSlug(duplicateBaseSlug(source.slug));
    const created = await this.unitOfWork.run(async (tx) => {
      const event = await this.events.insert(
        {
          ...copy.content,
          id: this.events.newId(),
          // One image belongs to one event: the copy starts without images (ADR-0020).
          images: NO_IMAGES,
          attendance: NO_ATTENDANCE,
          kind: source.kind,
          slug,
          form: copy.form,
          pricing: source.pricing,
          createdBy: actor,
        },
        tx,
      );
      for (const ticketType of copy.ticketTypes) {
        await this.ticketTypes.insert(event.id, ticketType, tx);
      }
      return event;
    });
    return this.snapshot(created, now);
  }

  async discard(id: string, revision: number, actor: Actor) {
    const current = await this.requireEvent(id);
    if (current.status !== "draft" || current.firstPublishedAt !== null) {
      throw new DomainError("event.discard_not_allowed");
    }
    await this.unitOfWork.run(async (tx) => {
      if (!(await this.events.discard(id, revision, actor, tx))) {
        throw new DomainError("common.conflict");
      }
      // A thrown-away draft keeps no images (ADR-0020).
      await queueImageRelease(this.outbox, tx, id, imageIds(imagesOf(current)));
    });
  }

  /**
   * BR-09: publishes the typed attendance of an archive-only event, as stored at this
   * revision. The controller requires `impact:approve`; an edit of the count later
   * drops the approval again (`nextAttendance`).
   */
  async approveAttendance(
    id: string,
    input: EventAttendanceApproveRequest,
    actor: Actor & { roles: readonly Role[]; requestId: string | null },
    now = new Date(),
  ): Promise<EventSnapshot> {
    const current = await this.requireEvent(id);
    if (current.kind !== "past" || current.attendance.count === null) {
      throw new DomainError("event.invalid_transition", "no attendance to approve");
    }
    if (current.revision !== input.revision) throw new DomainError("common.conflict");
    const updated = await this.unitOfWork.run(async (tx) => {
      const saved = await this.events.approveAttendance(
        id,
        input.revision,
        { at: now, by: actor.userId },
        actor,
        tx,
      );
      if (!saved) throw new DomainError("common.conflict");
      await this.audit.record(
        tx,
        {
          action: "event.attendance_approve",
          actor: { userId: actor.userId, roles: actor.roles },
          target: { type: "event", id },
          requestId: actor.requestId,
          meta: { count: current.attendance.count ?? 0 },
        },
        now,
      );
      await queueRevalidation(this.outbox, tx, saved);
      return saved;
    });
    return this.snapshot(updated, now);
  }

  /** Short-lived link for the preview iframe of `web` (D2); staff with `program:read`. */
  async createPreviewToken(id: string, actor: Actor, now = new Date()) {
    await this.requireEvent(id);
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now.getTime() + EVENT_LIMITS.previewTokenTtlMinutes * MINUTE_MS);
    await this.previewTokens.insert({
      tokenHash: hashPreviewToken(token),
      eventId: id,
      createdBy: actor.userId,
      expiresAt,
    });
    return { token, expiresAt };
  }

  private async requireEvent(id: string): Promise<EventRecord> {
    const event = await this.events.findById(id);
    if (!event) throw new DomainError("common.not_found");
    return event;
  }

  private async requireSelectableType(typeId: string) {
    if (!isSelectable(await this.types.findById(typeId))) {
      throw new DomainError("event.type_unavailable");
    }
  }

  private async freeSlug(base: string): Promise<string> {
    return firstFreeSlug(base, await this.events.usedSlugs(base));
  }

  private async snapshot(event: EventRecord, now: Date): Promise<EventSnapshot> {
    const [ticketTypes, type] = await Promise.all([
      this.ticketTypes.listByEvent(event.id),
      this.types.findById(event.typeId),
    ]);
    return snapshotOf(event, ticketTypes, type, now);
  }
}
