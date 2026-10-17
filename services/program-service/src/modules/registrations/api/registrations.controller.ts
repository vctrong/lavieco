import { Controller, Get, Headers, Inject, Param, StreamableFile } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  TOKEN_VERIFIER,
  TokenVerifier,
  ZodQuery,
  ZodValidationPipe,
  currentRequestId,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  registrationExportQuerySchema,
  registrationListQuerySchema,
  registrationListSchema,
  type RegistrationExportQuery,
  type RegistrationListQuery,
} from "@lavieco/shared/events";
import { STEP_UP_HEADER } from "@lavieco/shared/identity";

import { RegistrationsService } from "../application/registrations-service";
import { REGISTRATIONS_SERVICE } from "../registrations.tokens";

const idPipe = new ZodValidationPipe(objectIdSchema);
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const iso = (date: Date | null) => (date ? date.toISOString() : null);

/** Registrations of one event (`admin`): list with `program:read`, export with step-up. */
@ApiTags("registrations")
@Controller("internal/v1/events/:id/registrations")
export class RegistrationsController {
  constructor(
    @Inject(REGISTRATIONS_SERVICE) private readonly registrations: RegistrationsService,
    @Inject(TOKEN_VERIFIER) private readonly tokens: TokenVerifier,
  ) {}

  @Get()
  @RequirePermission("program:read")
  @ApiOperation({ summary: "One row per ticket, a column per question (hidden ones too)" })
  @ApiZodResponse(200, registrationListSchema)
  async list(
    @Param("id", idPipe) id: string,
    @ZodQuery(registrationListQuerySchema) query: RegistrationListQuery,
  ) {
    const page = await this.registrations.list(id, query);
    return {
      columns: page.columns,
      nextCursor: page.nextCursor,
      items: page.items.map(({ order, ticket, answers }) => ({
        orderId: order.id,
        orderCode: order.orderCode,
        orderStatus: order.status,
        buyer: {
          fullName: order.buyer.fullName,
          email: order.buyer.email,
          phone: order.buyer.phone,
        },
        ticketCode: ticket.code,
        ticketTypeName: ticket.ticketTypeName,
        ticketStatus: ticket.status,
        checkedInAt: iso(ticket.checkedInAt),
        registeredAt: order.createdAt.toISOString(),
        answers,
      })),
    };
  }

  @Get("export")
  @RequirePermission("registration:export")
  @ApiHeader({ name: STEP_UP_HEADER, required: true, description: "Step-up token (ADR-0021)" })
  @ApiProduces(XLSX)
  @ApiOperation({ summary: "Excel export of the registrations (personal data): step-up + audit" })
  async export(
    @Param("id", idPipe) id: string,
    @ZodQuery(registrationExportQuerySchema) query: RegistrationExportQuery,
    @CurrentPrincipal() staff: StaffPrincipal,
    @Headers(STEP_UP_HEADER) stepUpToken: string | undefined,
  ) {
    await this.tokens.verifyStepUp(stepUpToken, staff);
    const file = await this.registrations.export(id, query, {
      userId: staff.userId,
      roles: staff.roles,
      requestId: currentRequestId() ?? null,
    });
    return new StreamableFile(file.content, {
      type: XLSX,
      disposition: `attachment; filename="${file.fileName}"`,
      length: file.content.length,
    });
  }
}
