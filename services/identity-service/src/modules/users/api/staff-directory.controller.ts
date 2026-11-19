import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AllowServices, ApiZodResponse } from "@lavieco/service-kit";
import { staffDirectorySchema } from "@lavieco/shared/identity";

import { StaffDirectoryService } from "../application/staff-directory";
import { STAFF_DIRECTORY_SERVICE } from "../users.tokens";

/** Who can be assigned work (ADR-0030); program-service snapshots the name on orders. */
@ApiTags("staff")
@Controller("internal/v1/staff-directory")
export class StaffDirectoryController {
  constructor(@Inject(STAFF_DIRECTORY_SERVICE) private readonly directory: StaffDirectoryService) {}

  @Get()
  @AllowServices("program-service")
  @ApiOperation({ summary: "Active staff accounts: id and display name only" })
  @ApiZodResponse(200, staffDirectorySchema)
  list() {
    return this.directory.list();
  }
}
