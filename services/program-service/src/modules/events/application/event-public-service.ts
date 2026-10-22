import { DomainError } from "@lavieco/shared";
import type {
  FormQuestion,
  PublicEventListQuery,
  PublicEventState,
  RegistrationBlocker,
} from "@lavieco/shared/events";

import type { EventTypeRecord, EventTypeRepository } from "../../event-types";
import { visible, type TicketTypeRecord, type TicketTypeRepository } from "../../ticketing";
import type { EventRecord } from "../domain/event";
import { publicStateOf } from "../domain/public-state";
import {
  bookableOf,
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
  /** Badge and booking state, computed here and nowhere else. */
  state: PublicEventState;
};

/** What the checkout of the event page needs. Never the online link itself. */
export type PublicRegistrationInfo = {
  blocker: RegistrationBlocker | null;
  questions: FormQuestion[];
  safetyAcknowledgementRequired: boolean;
  guardianConfirmationRequired: boolean;
};

export type PublicEventDetailBundle = PublicEventBundle & { registration: PublicRegistrationInfo };

/**
 * A full record (preview) used where a public one is expected. The extra private
 * fields are never read: public DTOs are built field by field (event.mapper.ts).
 */
const publicView = (event: EventRecord): PublicEventRecord => ({
  ...event,
  hasOnlineLink: bookableOf(event).hasOnlineLink,
});

/** Read side of `/chuong-trinh` (called by `web`). Never returns drafts (S3). */
export class EventPublicService {
  constructor(
    private readonly events: EventRepository,
    private readonly ticketTypes: TicketTypeRepository,
    private readonly types: EventTypeRepository,
    private readonly previewTokens: PreviewTokenRepository,
  ) {}

  async list(query: PublicEventListQuery, now = new Date()) {
    const page = await this.events.listPublic(query, now);
    return {
      items: await this.bundle(page.items, now),
      nextCursor: page.nextCursor,
      total: page.total,
    };
  }

  async getBySlug(slug: string, now = new Date()): Promise<PublicEventDetailBundle> {
    const event = await this.events.findPublicBySlug(slug);
    const full = event ? await this.events.findPublicFullBySlug(slug) : null;
    if (!event || !full) throw new DomainError("common.not_found");
    const [bundle] = await this.bundle([event], now);
    return { ...bundle!, registration: registrationInfo(full, bundle!.ticketTypes, now) };
  }

  /** Any status, including drafts: the token itself is the authorization (D2). */
  async getPreview(token: string, now = new Date()): Promise<PublicEventDetailBundle> {
    const eventId = await this.previewTokens.findEventId(hashPreviewToken(token), now);
    const event = eventId ? await this.events.findById(eventId) : null;
    if (!event) throw new DomainError("common.not_found");
    const [bundle] = await this.bundle([publicView(event)], now);
    return { ...bundle!, registration: registrationInfo(event, bundle!.ticketTypes, now) };
  }

  private async bundle(events: PublicEventRecord[], now: Date): Promise<PublicEventBundle[]> {
    const [ticketTypes, types] = await Promise.all([
      this.ticketTypes.listByEvents(events.map((event) => event.id)),
      this.types.findByIds([...new Set(events.map((event) => event.typeId))]),
    ]);
    const typeById = new Map(types.map((type) => [type.id, type]));
    return events.map((event) => {
      const shown = visible(ticketTypes.get(event.id) ?? []);
      return {
        event,
        type: typeById.get(event.typeId) ?? null,
        ticketTypes: shown,
        state: publicStateOf(event, shown, now),
      };
    });
  }
}

function registrationInfo(
  event: EventRecord,
  ticketTypes: TicketTypeRecord[],
  now: Date,
): PublicRegistrationInfo {
  return {
    blocker: registrationBlocker(bookableOf(event), ticketTypes, now),
    questions: checkoutQuestions(event.form.questions),
    safetyAcknowledgementRequired: needsSafetyAcknowledgement(event),
    guardianConfirmationRequired: event.forChildren,
  };
}
