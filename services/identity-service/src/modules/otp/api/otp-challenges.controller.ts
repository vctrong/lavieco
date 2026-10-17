import { Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AllowServices, ApiZodResponse, ZodBody } from "@lavieco/service-kit";
import {
  otpChallengeCreateRequestSchema,
  otpChallengeCreateResponseSchema,
  otpChallengeVerifyRequestSchema,
  otpChallengeVerifyResponseSchema,
  type OtpChallengeCreateRequest,
  type OtpChallengeVerifyRequest,
} from "@lavieco/shared/identity";

import { OtpService } from "../application/otp-service";
import { OTP_SERVICE } from "../otp.tokens";

/**
 * Email OTP challenges. Called by `web` only (members and guests); program-service
 * will call them for guest checkout too (docs/05 §5.1).
 */
@ApiTags("otp")
@Controller("internal/v1/otp-challenges")
export class OtpChallengesController {
  constructor(@Inject(OTP_SERVICE) private readonly otp: OtpService) {}

  @Post()
  @HttpCode(201)
  @AllowServices("web")
  @ApiOperation({ summary: "Send a 6-digit code to an email address" })
  @ApiZodResponse(201, otpChallengeCreateResponseSchema)
  create(@ZodBody(otpChallengeCreateRequestSchema) body: OtpChallengeCreateRequest) {
    return this.otp.create(body);
  }

  @Post("verify")
  @HttpCode(200)
  @AllowServices("web")
  @ApiOperation({ summary: "Check a code; returns a single-use verification proof" })
  @ApiZodResponse(200, otpChallengeVerifyResponseSchema)
  verify(@ZodBody(otpChallengeVerifyRequestSchema) body: OtpChallengeVerifyRequest) {
    return this.otp.verify(body.challengeId, body.code);
  }
}
