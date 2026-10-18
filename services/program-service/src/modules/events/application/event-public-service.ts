import { DomainError } from "@lavieco/shared";
import type {
  FormQuestion,
  PublicEventListQuery,
  RegistrationBlocker,
} from "@lavieco/shared/events";

import type { EventTypeRecord, EventTypeRepository } from "../../event-types";
import { visible, type TicketTypeRecord, type TicketTypeRepository } from "../../ticketing";
import type { EventRecord } from "../domain/event";
import {
  checkoutQuestions,
  needsSafetyAcknowledgement,
  registrationBlocker,
} from "../domain/registration";
import { hashPreviewToken } from "./event-admin-service";
import type { EventRepository, PublicEventRecord } from "./ports/event-repository.port";
import type { PreviewTokenRepository } from "./ports/preview-token-repository.port";

export type PublicEventBundle = {
  event: PublicEventRecord;
  type: EventTypeRecord | null;
  /** Visible ticket types only. */
  ticketTypes: TicketTypeRecord[];
};

/** What the checkout of the event page needs. Never the online link itself. */
export type PublicRegistrationInfo = {
  blocker: RegistrationBlocker | null;
  questions: FormQuestion[];
  safetyAcknowledgementRequired: boolean;
  guardianConfirmationRequired: boolean;
};

export type PublicEventDetailBundle = PublicEventBundle & { registration: PublicRegistrationInfo };

/** Read side of `/chuong-trinh` (called by `web`). Never returns drafts (S3). */
export class EventPublicService {
  constructor(
    private readonly events: EventRepository,
    private readonly ticketTypes: TicketTypeRepository,
    private readonly types: EventTypeRepository,
    private readonly previewTokens: PreviewTokenRepository,
  ) {}

  async list(query: PublicEventListQuery) {
    const page = await this.events.listPublic(query);
    return { items: await this.bundle(page.items), nextCursor: page.nextCursor };
  }

  async getBySlug(slug: string, now = new Date()): Promise<PublicEventDetailBundle> {
    const event = await this.events.findPublicBySlug(slug);
    const full = event ? await this.events.findPublicFullBySlug(slug) : null;
    if (!event || !full) throw new DomainError("common.not_found");
    const [bundle] = await this.bundle([event]);
    return { ...bundle!, registration: registrationInfo(full, bundle!.ticketTypes, now) };
  }

  /** Any status, including drafts: the token itself is the authorization (D2). */
  async getPreview(token: string, now = new Date()): Promise<PublicEventDetailBundle> {
    const eventId = await this.previewTokens.findEventId(hashPreviewToken(token), now);
    const event = eventId ? await this.events.findById(eventId) : null;
    if (!event) throw new DomainError("common.not_found");
    const [bundle] = await this.bundle([event]);
    return { ...bundle!, registration: registrationInfo(event, bundle!.ticketTypes, now) };
  }

  private async bundle(events: PublicEventRecord[]): Promise<PublicEventBundle[]> {
    const [ticketTypes, types] = await Promise.all([
      this.ticketTypes.listByEvents(events.map((event) => event.id)),
      this.types.findByIds([...new Set(events.map((event) => event.typeId))]),
    ]);
    const typeById = new Map(types.map((type) => [type.id, type]));
    return events.map((event) => ({
      event,
      type: typeById.get(event.typeId) ?? null,
      ticketTypes: visible(ticketTypes.get(event.id) ?? []),
    }));
  }
}

function registrationInfo(
  event: EventRecord,
  ticketTypes: TicketTypeRecord[],
  now: Date,
): PublicRegistrationInfo {
  return {
    blocker: registrationBlocker(event, ticketTypes, now),
    questions: checkoutQuestions(event.form.questions),
    safetyAcknowledgementRequired: needsSafetyAcknowledgement(event),
    guardianConfirmationRequired: event.forChildren,
  };
}
