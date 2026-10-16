import { Module } from "@nestjs/common";

import { UsersModule } from "../users";
import { IdentityOutboxHandlers } from "./outbox-handlers";

/** Thin module: only registers handlers; reading/locking/retrying is in service-kit. */
@Module({ imports: [UsersModule], providers: [IdentityOutboxHandlers] })
export class IdentityOutboxModule {}
