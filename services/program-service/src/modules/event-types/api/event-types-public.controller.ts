import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AllowServices, ApiZodResponse } from "@lavieco/service-kit";
import { publicEventTypeListSchema } from "@lavieco/shared/events";

import { EventTypeService } from "../application/event-type-service";
import { EVENT_TYPE_SERVICE } from "../event-types.tokens";
import { toPublicEventTypeDto } from "./event-type.mapper";

/** Filter chips of `/chuong-trinh` (called by `web`). */
@ApiTags("event-types")
@Controller("internal/v1/public-event-types")
export class EventTypesPublicController {
  constructor(@Inject(EVENT_TYPE_SERVICE) private readonly types: EventTypeService) {}

  @Get()
  @AllowServices("web")
  @ApiOperation({ summary: "Active program types" })
  @ApiZodResponse(200, publicEventTypeListSchema)
  async list() {
    const items = await this.types.list(false);
    return { items: items.map(toPublicEventTypeDto) };
  }
}
