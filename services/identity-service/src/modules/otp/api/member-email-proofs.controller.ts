import { Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequireMember,
  ZodBody,
  type MemberPrincipal,
} from "@lavieco/service-kit";
import {
  memberEmailProofRequestSchema,
  otpChallengeVerifyResponseSchema,
  type MemberEmailProofRequest,
} from "@lavieco/shared/identity";

import { OtpService } from "../application/otp-service";
import { OTP_SERVICE } from "../otp.tokens";

/** A signed-in member with a verified email skips the checkout OTP (ADR-0021). */
@ApiTags("otp")
@Controller("internal/v1/members/me/email-proofs")
export class MemberEmailProofsController {
  constructor(@Inject(OTP_SERVICE) private readonly otp: OtpService) {}

  @Post()
  @HttpCode(201)
  @RequireMember()
  @ApiOperation({ summary: "Proof of the member's own verified email (same format as OTP)" })
  @ApiZodResponse(201, otpChallengeVerifyResponseSchema)
  create(
    @CurrentPrincipal() principal: MemberPrincipal,
    @ZodBody(memberEmailProofRequestSchema) body: MemberEmailProofRequest,
  ) {
    return this.otp.issueMemberProof(principal.userId, body.purpose);
  }
}
