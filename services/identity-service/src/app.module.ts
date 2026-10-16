import { type DynamicModule, Module } from "@nestjs/common";

import type { Logger } from "@lavieco/observability";
import {
  AuthModule as AccessModule,
  HealthModule,
  LoggingModule,
  MongoModule,
  NotifyModule,
  OutboxModule,
  ServiceConfigModule,
  parseTrustedServiceKeys,
  type OutboxOptions,
} from "@lavieco/service-kit";
import type { EmailSender } from "@lavieco/service-kit/ports";

import type { IdentityEnv } from "./config/env";
import { AuditModule } from "./modules/audit";
import { AuthModule } from "./modules/auth";
import { InvitationsModule } from "./modules/invitations";
import { OtpModule } from "./modules/otp";
import { IdentityOutboxModule } from "./modules/outbox";
import { SecurityModule } from "./modules/security";
import { SessionsModule } from "./modules/sessions";
import { SigningKeyStore, SigningKeysModule } from "./modules/signing-keys";
import { UsersModule } from "./modules/users";

export type AppOverrides = {
  logger?: Logger;
  emailSender?: EmailSender;
  outbox?: Partial<OutboxOptions>;
};

@Module({})
export class AppModule {
  /** Built from parsed env so tests can start the real module graph with fakes for email. */
  static forRoot(env: IdentityEnv, overrides: AppOverrides = {}): DynamicModule {
    const keys = new SigningKeyStore(env.JWT_SIGNING_KEYS);
    return {
      module: AppModule,
      imports: [
        ServiceConfigModule.forRoot(env),
        LoggingModule.forRoot({
          service: "identity-service",
          level: env.LOG_LEVEL,
          logger: overrides.logger,
        }),
        MongoModule.forRoot({
          uri: env.MONGODB_URI,
          dbName: env.MONGODB_DB,
          autoIndex: env.NODE_ENV !== "production",
        }),
        AccessModule.forRoot({
          serviceName: "identity-service",
          userKeys: { resolver: keys.resolver() },
          trustedServiceKeys: parseTrustedServiceKeys(env.SERVICE_TOKEN_TRUSTED_KEYS),
        }),
        NotifyModule.forRoot(overrides.emailSender ? { sender: overrides.emailSender } : { env }),
        OutboxModule.forRoot(overrides.outbox),
        HealthModule,
        SecurityModule,
        SigningKeysModule.forRoot(keys),
        UsersModule,
        AuditModule,
        SessionsModule,
        OtpModule,
        InvitationsModule,
        AuthModule,
        IdentityOutboxModule,
      ],
    };
  }
}
