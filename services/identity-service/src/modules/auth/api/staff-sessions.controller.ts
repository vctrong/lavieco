import { Controller, Get, HttpCode, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  AllowServices,
  ApiZodResponse,
  CurrentPrincipal,
  RequireStaff,
  ZodBody,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import {
  staffLoginRequestSchema,
  staffLoginResponseSchema,
  staffMfaRequestSchema,
  staffProfileSchema,
  stepUpRequestSchema,
  stepUpResponseSchema,
  tokenPairSchema,
  type StaffLoginRequest,
  type StaffMfaRequest,
  type StepUpRequest,
} from "@lavieco/shared/identity";

import { StaffAuthService } from "../application/staff-auth-service";
import { STAFF_AUTH_SERVICE } from "../auth.tokens";

@ApiTags("staff")
@Controller("internal/v1")
export class StaffSessionsController {
  constructor(@Inject(STAFF_AUTH_SERVICE) private readonly auth: StaffAuthService) {}

  @Post("staff-sessions")
  @HttpCode(200)
  @AllowServices("admin")
  @ApiOperation({
    summary: "Staff login step 1 (password); returns a 5-minute second-factor token",
  })
  @ApiZodResponse(200, staffLoginResponseSchema)
  login(@ZodBody(staffLoginRequestSchema) body: StaffLoginRequest) {
    return this.auth.login(body.email, body.password);
  }

  @Post("staff-sessions/mfa")
  @HttpCode(200)
  @AllowServices("admin")
  @ApiOperation({ summary: "Staff login step 2 (TOTP or recovery code); opens the session" })
  @ApiZodResponse(200, tokenPairSchema)
  verify(@ZodBody(staffMfaRequestSchema) body: StaffMfaRequest) {
    return this.auth.verifySecondFactor(body.mfaToken, body.code);
  }

  @Post("staff/step-up")
  @HttpCode(200)
  @RequireStaff()
  @ApiOperation({
    summary: "Re-confirm with a TOTP code; returns a 5-minute step-up token (ADR-0021)",
  })
  @ApiZodResponse(200, stepUpResponseSchema)
  stepUp(
    @CurrentPrincipal() principal: StaffPrincipal,
    @ZodBody(stepUpRequestSchema) body: StepUpRequest,
  ) {
    return this.auth.stepUp(principal.userId, principal.sessionId, body.code);
  }

  @Get("staff/me")
  @RequireStaff()
  @ApiOperation({ summary: "Profile and permissions of the signed-in staff member" })
  @ApiZodResponse(200, staffProfileSchema)
  me(@CurrentPrincipal() principal: StaffPrincipal) {
    return this.auth.profile(principal.userId);
  }
}
