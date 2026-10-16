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
  refreshSessionRequestSchema,
  tokenPairSchema,
  type RefreshSessionRequest,
} from "@lavieco/shared/identity";

import { SessionService } from "../application/session-service";
import { SESSION_SERVICE } from "../sessions.tokens";

/** Each BFF only ever handles its own kind of session (ADR-0016). */
const SESSION_TYPE_BY_CALLER = { web: "member", admin: "staff" } as const;

@ApiTags("sessions")
@Controller("internal/v1/sessions")
export class SessionsController {
  constructor(@Inject(SESSION_SERVICE) private readonly sessions: SessionService) {}

  @Post("refresh")
  @HttpCode(200)
  @AllowServices("web", "admin")
  @ApiOperation({ summary: "Rotate a refresh token (single use, reuse revokes the family)" })
  @ApiZodResponse(200, tokenPairSchema)
  refresh(
    @ZodBody(refreshSessionRequestSchema) body: RefreshSessionRequest,
    @CurrentPrincipal() caller: ServicePrincipal,
  ) {
    const expected = SESSION_TYPE_BY_CALLER[caller.name as keyof typeof SESSION_TYPE_BY_CALLER];
    return this.sessions.refresh(body.refreshToken, expected);
  }

  @Post("revoke")
  @HttpCode(204)
  @AllowServices("web", "admin")
  @ApiOperation({ summary: "Log out: revoke the whole session family" })
  @ApiZodResponse(204)
  async revoke(@ZodBody(refreshSessionRequestSchema) body: RefreshSessionRequest) {
    await this.sessions.revoke(body.refreshToken);
  }
}
