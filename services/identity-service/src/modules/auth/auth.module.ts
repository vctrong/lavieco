import { Module } from "@nestjs/common";

import { OUTBOX_PORT, SERVICE_CONFIG, UNIT_OF_WORK } from "@lavieco/service-kit";
import type { OutboxPort, UnitOfWork } from "@lavieco/service-kit/ports";

import type { IdentityEnv } from "../../config/env";
import { AUDIT_RECORDER, AuditModule, type AuditRecorder } from "../audit";
import { OTP_SERVICE, OtpModule, type OtpService } from "../otp";
import { PASSWORD_HASHER, SECRET_BOX, type PasswordHasher, type SecretBox } from "../security";
import { SESSION_SERVICE, SessionsModule, type SessionService } from "../sessions";
import { TOKEN_SIGNER, type TokenSigner } from "../signing-keys";
import { USER_REPOSITORY, UsersModule, type UserRepository } from "../users";
import { MembersController } from "./api/members.controller";
import { StaffSessionsController } from "./api/staff-sessions.controller";
import { MEMBER_AUTH_SERVICE, STAFF_AUTH_SERVICE } from "./auth.tokens";
import { MemberAuthService } from "./application/member-auth-service";
import {
  GOOGLE_IDENTITY,
  type GoogleIdentityProvider,
} from "./application/ports/google-identity.port";
import { StaffAuthService } from "./application/staff-auth-service";
import { GoogleOAuthClient } from "./infrastructure/google-oauth-client";

@Module({
  imports: [UsersModule, SessionsModule, OtpModule, AuditModule],
  controllers: [StaffSessionsController, MembersController],
  providers: [
    {
      provide: GOOGLE_IDENTITY,
      useFactory: (env: IdentityEnv) =>
        new GoogleOAuthClient({
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          redirectUri: env.GOOGLE_REDIRECT_URI,
        }),
      inject: [SERVICE_CONFIG],
    },
    {
      provide: STAFF_AUTH_SERVICE,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        secretBox: SecretBox,
        signer: TokenSigner,
        sessions: SessionService,
        audit: AuditRecorder,
      ) => new StaffAuthService(users, hasher, secretBox, signer, sessions, audit),
      inject: [
        USER_REPOSITORY,
        PASSWORD_HASHER,
        SECRET_BOX,
        TOKEN_SIGNER,
        SESSION_SERVICE,
        AUDIT_RECORDER,
      ],
    },
    {
      provide: MEMBER_AUTH_SERVICE,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        otp: OtpService,
        sessions: SessionService,
        google: GoogleIdentityProvider,
        unitOfWork: UnitOfWork,
        outbox: OutboxPort,
        audit: AuditRecorder,
      ) => new MemberAuthService(users, hasher, otp, sessions, google, unitOfWork, outbox, audit),
      inject: [
        USER_REPOSITORY,
        PASSWORD_HASHER,
        OTP_SERVICE,
        SESSION_SERVICE,
        GOOGLE_IDENTITY,
        UNIT_OF_WORK,
        OUTBOX_PORT,
        AUDIT_RECORDER,
      ],
    },
  ],
})
export class AuthModule {}
