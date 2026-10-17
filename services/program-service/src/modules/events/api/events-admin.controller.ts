import { Controller, Get, HttpCode, Inject, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  ZodBody,
  ZodQuery,
  ZodValidationPipe,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  eventCreateRequestSchema,
  eventFormUpdateRequestSchema,
  eventListQuerySchema,
  eventListSchema,
  eventPreviewTokenSchema,
  eventRevisionRequestSchema,
  eventSchema,
  eventStatusChangeRequestSchema,
  eventUpdateRequestSchema,
  ticketTypeCreateRequestSchema,
  ticketTypeListSchema,
  ticketTypeSchema,
  ticketTypeUpdateRequestSchema,
  type EventCreateRequest,
  type EventFormUpdateRequest,
  type EventListQuery,
  type EventRevisionRequest,
  type EventStatusChangeRequest,
  type EventUpdateRequest,
  type TicketTypeCreateRequest,
  type TicketTypeUpdateRequest,
} from "@lavieco/shared/events";

import { EventAdminService } from "../application/event-admin-service";
import { EventTicketTypesService } from "../application/event-ticket-types-service";
import { EVENT_ADMIN_SERVICE, EVENT_TICKET_TYPES_SERVICE } from "../events.tokens";
import { toEventDto, toEventListItemDto, toTicketTypeDto } from "./event.mapper";

const idPipe = new ZodValidationPipe(objectIdSchema);
const actorOf = (principal: StaffPrincipal) => ({ userId: principal.userId });

/** Admin screens `/events` (UC-32), called by `admin` with the staff access token. */
@ApiTags("events")
@Controller("internal/v1/events")
export class EventsAdminController {
  constructor(
    @Inject(EVENT_ADMIN_SERVICE) private readonly events: EventAdminService,
    @Inject(EVENT_TICKET_TYPES_SERVICE) private readonly ticketTypes: EventTicketTypesService,
  ) {}

  @Get()
  @RequirePermission("program:read")
  @ApiOperation({ summary: "List events with filters, counts per status, cursor pagination" })
  @ApiZodResponse(200, eventListSchema)
  async list(@ZodQuery(eventListQuerySchema) query: EventListQuery) {
    const page = await this.events.list(query);
    return {
      items: page.items.map(({ event, ticketTypes }) => toEventListItemDto(event, ticketTypes)),
      nextCursor: page.nextCursor,
      counts: page.counts,
    };
  }

  @Post()
  @RequirePermission("program:write")
  @ApiOperation({ summary: "Create a draft event (standard, or past for the archive)" })
  @ApiZodResponse(201, eventSchema)
  async create(
    @ZodBody(eventCreateRequestSchema) body: EventCreateRequest,
    @CurrentPrincipal() principal: StaffPrincipal,
  ) {
    return toEventDto(await this.events.create(body, actorOf(principal)));
  }

  @Get(":id")
  @RequirePermission("program:read")
  @ApiOperation({ summary: "One event with ticket types, form and publishing checklist" })
  @ApiZodResponse(200, eventSchema)
  async get(@Param("id", idPipe) id: string) {
    return toEventDto(await this.events.get(id));
  }

  @Put(":id")
  @RequirePermission("program:write")
  @ApiOperation({ summary: "Replace the event details (optimistic lock on revision)" })
  @ApiZodResponse(200, eventSchema)
  async update(
    @Param("id", idPipe) id: string,
    @ZodBody(eventUpdateRequestSchema) body: EventUpdateRequest,
    @CurrentPrincipal() principal: StaffPrincipal,
  ) {
    return toEventDto(await this.events.updateDetails(id, body, actorOf(principal)));
  }

  @Put(":id/form")
  @RequirePermission("program:write")
  @ApiOperation({ summary: "Replace the custom questions (restricted once people registered)" })
  @ApiZodResponse(200, eventSchema)
  async updateForm(
    @Param("id", idPipe) id: string,
    @ZodBody(eventFormUpdateRequestSchema) body: EventFormUpdateRequest,
    @CurrentPrincipal() principal: StaffPrincipal,
  ) {
    return toEventDto(await this.events.updateForm(id, body, actorOf(principal)));
  }

  @Post(":id/status")
  @HttpCode(200)
  @RequirePermission("program:write")
  @ApiOperation({ summary: "Publish, unpublish, close, reopen or end (no second reviewer)" })
  @ApiZodResponse(200, eventSchema)
  async changeStatus(
    @Param("id", idPipe) id: string,
    @ZodBody(eventStatusChangeRequestSchema) body: EventStatusChangeRequest,
    @CurrentPrincipal() principal: StaffPrincipal,
  ) {
    return toEventDto(await this.events.changeStatus(id, body, actorOf(principal)));
  }

  @Post(":id/duplicate")
  @RequirePermission("program:write")
  @ApiOperation({ summary: "Copy an event (details, form, ticket types) into a new draft" })
  @ApiZodResponse(201, eventSchema)
  async duplicate(@Param("id", idPipe) id: string, @CurrentPrincipal() principal: StaffPrincipal) {
    return toEventDto(await this.events.duplicate(id, actorOf(principal)));
  }

  @Post(":id/discard")
  @HttpCode(204)
  @RequirePermission("program:write")
  @ApiOperation({ summary: "Throw away a never-published draft (soft, frees the slug)" })
  @ApiZodResponse(204)
  async discard(
    @Param("id", idPipe) id: string,
    @ZodBody(eventRevisionRequestSchema) body: EventRevisionRequest,
    @CurrentPrincipal() principal: StaffPrincipal,
  ) {
    await this.events.discard(id, body.revision, actorOf(principal));
  }

  @Post(":id/preview-tokens")
  @RequirePermission("program:read")
  @ApiOperation({ summary: "Short-lived token for the preview page rendered by web" })
  @ApiZodResponse(201, eventPreviewTokenSchema)
  async previewToken(
    @Param("id", idPipe) id: string,
    @CurrentPrincipal() principal: StaffPrincipal,
  ) {
    const { token, expiresAt } = await this.events.createPreviewToken(id, actorOf(principal));
    return { token, expiresAt: expiresAt.toISOString() };
  }

  @Get(":id/ticket-types")
  @RequirePermission("program:read")
  @ApiOperation({ summary: "Ticket types of an event, hidden ones included" })
  @ApiZodResponse(200, ticketTypeListSchema)
  async listTicketTypes(@Param("id", idPipe) id: string) {
    return { items: (await this.ticketTypes.list(id)).map(toTicketTypeDto) };
  }

  @Post(":id/ticket-types")
  @RequirePermission("program:write")
  @ApiOperation({ summary: "Add a ticket type (whole VND, null quantity = unlimited)" })
  @ApiZodResponse(201, ticketTypeSchema)
  async createTicketType(
    @Param("id", idPipe) id: string,
    @ZodBody(ticketTypeCreateRequestSchema) body: TicketTypeCreateRequest,
  ) {
    return toTicketTypeDto(await this.ticketTypes.create(id, body));
  }

  @Put(":id/ticket-types/:ticketTypeId")
  @RequirePermission("program:write")
  @ApiOperation({ summary: "Edit or hide a ticket type (price frozen once seats are taken)" })
  @ApiZodResponse(200, ticketTypeSchema)
  async updateTicketType(
    @Param("id", idPipe) id: string,
    @Param("ticketTypeId", idPipe) ticketTypeId: string,
    @ZodBody(ticketTypeUpdateRequestSchema) body: TicketTypeUpdateRequest,
  ) {
    return toTicketTypeDto(await this.ticketTypes.update(id, ticketTypeId, body));
  }
}
