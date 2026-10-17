import { Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AllowServices, ApiZodResponse, ZodBody } from "@lavieco/service-kit";
import {
  invitationAcceptRequestSchema,
  invitationAcceptResponseSchema,
  invitationInspectRequestSchema,
  invitationInspectResponseSchema,
  type InvitationAcceptRequest,
  type InvitationInspectRequest,
} from "@lavieco/shared/identity";

import { InvitationService } from "../application/invitation-service";
import { INVITATION_SERVICE } from "../invitations.tokens";

@ApiTags("invitations")
@Controller("internal/v1/invitations")
export class InvitationsController {
  constructor(@Inject(INVITATION_SERVICE) private readonly invitations: InvitationService) {}

  @Post("inspect")
  @HttpCode(200)
  @AllowServices("admin")
  @ApiOperation({ summary: "Open an invitation link: email and the TOTP seed to scan" })
  @ApiZodResponse(200, invitationInspectResponseSchema)
  inspect(@ZodBody(invitationInspectRequestSchema) body: InvitationInspectRequest) {
    return this.invitations.inspect(body.token);
  }

  @Post("accept")
  @HttpCode(200)
  @AllowServices("admin")
  @ApiOperation({ summary: "Set password + confirm TOTP; returns one-time recovery codes" })
  @ApiZodResponse(200, invitationAcceptResponseSchema)
  accept(@ZodBody(invitationAcceptRequestSchema) body: InvitationAcceptRequest) {
    return this.invitations.accept(body);
  }
}
