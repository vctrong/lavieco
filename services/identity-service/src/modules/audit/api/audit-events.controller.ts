import { Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  AllowServices,
  ApiZodResponse,
  CurrentPrincipal,
  ZodBody,
  type ServicePrincipal,
} from "@lavieco/service-kit";
import {
  auditEventIngestRequestSchema,
  type AuditEventIngestRequest,
} from "@lavieco/shared/identity";

import { AuditIngestService } from "../application/audit-ingest-service";
import { AUDIT_INGEST_SERVICE } from "../audit.tokens";

/** Audit events of other services, delivered by their outbox (docs/03 §4.4, ADR-0021). */
@ApiTags("audit")
@Controller("internal/v1/audit-events")
export class AuditEventsController {
  constructor(@Inject(AUDIT_INGEST_SERVICE) private readonly ingest: AuditIngestService) {}

  @Post()
  @HttpCode(204)
  @AllowServices("program-service")
  @ApiOperation({ summary: "Record an audit event of another service (idempotent on eventId)" })
  @ApiZodResponse(204)
  async create(
    @CurrentPrincipal() principal: ServicePrincipal,
    @ZodBody(auditEventIngestRequestSchema) body: AuditEventIngestRequest,
  ) {
    await this.ingest.ingest(principal.name, body);
  }
}
