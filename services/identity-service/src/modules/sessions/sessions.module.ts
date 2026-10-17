import { Module } from "@nestjs/common";

import { SERVICE_CONFIG } from "@lavieco/service-kit";

import type { IdentityEnv } from "../../config/env";
import { AUDIT_RECORDER, AuditModule, type AuditRecorder } from "../audit";
import { TOKEN_SIGNER, type TokenSigner } from "../signing-keys";
import { USER_REPOSITORY, UsersModule, type UserRepository } from "../users";
import { SessionsController } from "./api/sessions.controller";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "./application/ports/session-repository.port";
import { SessionService } from "./application/session-service";
import { sessionPersistence } from "./infrastructure/session.model";
import { MongoSessionRepository } from "./infrastructure/session.repository";
import { SESSION_SERVICE } from "./sessions.tokens";

@Module({
  imports: [sessionPersistence, UsersModule, AuditModule],
  controllers: [SessionsController],
  providers: [
    { provide: SESSION_REPOSITORY, useClass: MongoSessionRepository },
    {
      provide: SESSION_SERVICE,
      useFactory: (
        sessions: SessionRepository,
        users: UserRepository,
        signer: TokenSigner,
        audit: AuditRecorder,
        env: IdentityEnv,
      ) =>
        new SessionService(sessions, users, signer, audit, {
          staffAccessTtlSeconds: env.STAFF_ACCESS_TTL_SECONDS,
          memberAccessTtlSeconds: env.MEMBER_ACCESS_TTL_SECONDS,
          staffRefreshTtlSeconds: env.STAFF_REFRESH_TTL_HOURS * 3600,
          memberRefreshTtlSeconds: env.MEMBER_REFRESH_TTL_DAYS * 86400,
        }),
      inject: [SESSION_REPOSITORY, USER_REPOSITORY, TOKEN_SIGNER, AUDIT_RECORDER, SERVICE_CONFIG],
    },
  ],
  exports: [SESSION_SERVICE],
})
export class SessionsModule {}
