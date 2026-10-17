import { Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  ApiZodResponse,
  RequirePermission,
  ZodBody,
  ZodQuery,
  ZodValidationPipe,
} from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  eventTypeCreateRequestSchema,
  eventTypeListQuerySchema,
  eventTypeListSchema,
  eventTypeSchema,
  eventTypeUpdateRequestSchema,
  type EventTypeCreateRequest,
  type EventTypeListQuery,
  type EventTypeUpdateRequest,
} from "@lavieco/shared/events";

import { EventTypeService } from "../application/event-type-service";
import { EVENT_TYPE_SERVICE } from "../event-types.tokens";
import { toEventTypeDto } from "./event-type.mapper";

/** Program types in the admin settings (`/events/types`), called with a staff token. */
@ApiTags("event-types")
@Controller("internal/v1/event-types")
export class EventTypesAdminController {
  constructor(@Inject(EVENT_TYPE_SERVICE) private readonly types: EventTypeService) {}

  @Get()
  @RequirePermission("program:read")
  @ApiOperation({ summary: "List program types, archived ones included on request" })
  @ApiZodResponse(200, eventTypeListSchema)
  async list(@ZodQuery(eventTypeListQuerySchema) query: EventTypeListQuery) {
    const items = await this.types.list(query.includeArchived);
    return { items: items.map(toEventTypeDto) };
  }

  @Post()
  @RequirePermission("program:write")
  @ApiOperation({ summary: "Create a program type" })
  @ApiZodResponse(201, eventTypeSchema)
  async create(@ZodBody(eventTypeCreateRequestSchema) body: EventTypeCreateRequest) {
    return toEventTypeDto(await this.types.create(body));
  }

  @Patch(":id")
  @RequirePermission("program:write")
  @ApiOperation({ summary: "Rename, reorder, archive or restore a program type" })
  @ApiZodResponse(200, eventTypeSchema)
  async update(
    @Param("id", new ZodValidationPipe(objectIdSchema)) id: string,
    @ZodBody(eventTypeUpdateRequestSchema) body: EventTypeUpdateRequest,
  ) {
    return toEventTypeDto(await this.types.update(id, body));
  }
}
