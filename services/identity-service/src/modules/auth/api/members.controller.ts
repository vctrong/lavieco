import { Controller, Get, HttpCode, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  AllowServices,
  ApiZodResponse,
  CurrentPrincipal,
  RequireMember,
  ZodBody,
  type MemberPrincipal,
} from "@lavieco/service-kit";
import {
  memberGoogleRequestSchema,
  memberLoginRequestSchema,
  memberPasswordResetRequestSchema,
  memberProfileSchema,
  memberRegisterRequestSchema,
  tokenPairSchema,
  type MemberGoogleRequest,
  type MemberLoginRequest,
  type MemberPasswordResetRequest,
  type MemberRegisterRequest,
} from "@lavieco/shared/identity";

import { MemberAuthService } from "../application/member-auth-service";
import { MEMBER_AUTH_SERVICE } from "../auth.tokens";

/** Member accounts, called by the `web` BFF (docs/05 §6, auth). */
@ApiTags("members")
@Controller("internal/v1")
export class MembersController {
  constructor(@Inject(MEMBER_AUTH_SERVICE) private readonly auth: MemberAuthService) {}

  @Post("members")
  @HttpCode(201)
  @AllowServices("web")
  @ApiOperation({ summary: "Create a member account after an email OTP (purpose signup)" })
  @ApiZodResponse(201, tokenPairSchema)
  register(@ZodBody(memberRegisterRequestSchema) body: MemberRegisterRequest) {
    return this.auth.register(body);
  }

  @Post("member-sessions")
  @HttpCode(200)
  @AllowServices("web")
  @ApiOperation({ summary: "Member login with email and password" })
  @ApiZodResponse(200, tokenPairSchema)
  login(@ZodBody(memberLoginRequestSchema) body: MemberLoginRequest) {
    return this.auth.login(body.email, body.password);
  }

  @Post("member-sessions/google")
  @HttpCode(200)
  @AllowServices("web")
  @ApiOperation({ summary: "Member login with Google (authorization code + PKCE)" })
  @ApiZodResponse(200, tokenPairSchema)
  google(@ZodBody(memberGoogleRequestSchema) body: MemberGoogleRequest) {
    return this.auth.google(body);
  }

  @Post("member-passwords/reset")
  @HttpCode(204)
  @AllowServices("web")
  @ApiOperation({ summary: "Set a new password after an email OTP (purpose reset_password)" })
  @ApiZodResponse(204)
  async reset(@ZodBody(memberPasswordResetRequestSchema) body: MemberPasswordResetRequest) {
    await this.auth.resetPassword(body);
  }

  @Get("members/me")
  @RequireMember()
  @ApiOperation({ summary: "Profile of the signed-in member" })
  @ApiZodResponse(200, memberProfileSchema)
  me(@CurrentPrincipal() principal: MemberPrincipal) {
    return this.auth.profile(principal.userId);
  }
}
