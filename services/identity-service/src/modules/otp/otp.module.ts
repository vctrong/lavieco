import { Module } from "@nestjs/common";

import { EMAIL_SENDER, SERVICE_CONFIG } from "@lavieco/service-kit";
import type { EmailSender } from "@lavieco/service-kit/ports";

import type { IdentityEnv } from "../../config/env";
import { TOKEN_SIGNER, type TokenSigner } from "../signing-keys";
import { USER_REPOSITORY, UsersModule, type UserRepository } from "../users";
import { MemberEmailProofsController } from "./api/member-email-proofs.controller";
import { OtpChallengesController } from "./api/otp-challenges.controller";
import { OtpService } from "./application/otp-service";
import {
  OTP_MAILER,
  OTP_REPOSITORY,
  RATE_LIMITER,
  type OtpMailer,
  type OtpRepository,
  type RateLimiter,
} from "./application/ports/otp.ports";
import { EmailOtpMailer } from "./infrastructure/email-otp-mailer";
import { MongoRateLimiter } from "./infrastructure/mongo-rate-limiter";
import { otpPersistence } from "./infrastructure/otp-code.model";
import { MongoOtpRepository } from "./infrastructure/otp.repository";
import { OTP_SERVICE } from "./otp.tokens";

@Module({
  imports: [otpPersistence, UsersModule],
  controllers: [OtpChallengesController, MemberEmailProofsController],
  providers: [
    { provide: OTP_REPOSITORY, useClass: MongoOtpRepository },
    { provide: RATE_LIMITER, useClass: MongoRateLimiter },
    {
      provide: OTP_MAILER,
      useFactory: (sender: EmailSender, env: IdentityEnv) =>
        new EmailOtpMailer(sender, env.WEB_APP_URL),
      inject: [EMAIL_SENDER, SERVICE_CONFIG],
    },
    {
      provide: OTP_SERVICE,
      useFactory: (
        repository: OtpRepository,
        limiter: RateLimiter,
        mailer: OtpMailer,
        users: UserRepository,
        signer: TokenSigner,
        env: IdentityEnv,
      ) =>
        new OtpService(
          repository,
          limiter,
          mailer,
          users,
          signer,
          Buffer.from(env.OTP_PEPPER, "base64"),
        ),
      inject: [
        OTP_REPOSITORY,
        RATE_LIMITER,
        OTP_MAILER,
        USER_REPOSITORY,
        TOKEN_SIGNER,
        SERVICE_CONFIG,
      ],
    },
  ],
  exports: [OTP_SERVICE],
})
export class OtpModule {}
