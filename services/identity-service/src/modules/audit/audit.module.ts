import { Module } from "@nestjs/common";

import { USER_REPOSITORY, UsersModule, type UserRepository } from "../users";
import { AuditEventsController } from "./api/audit-events.controller";
import { AuditIngestService } from "./application/audit-ingest-service";
import { AUDIT_RECORDER, type AuditRecorder } from "./application/ports/audit-recorder.port";
import { AUDIT_INGEST_SERVICE } from "./audit.tokens";
import { auditPersistence } from "./infrastructure/audit-event.model";
import { MongoAuditRecorder } from "./infrastructure/mongo-audit-recorder";

// TODO(UC-29): read endpoint for the audit log (`audit:read`), with the admin screen.
@Module({
  imports: [auditPersistence, UsersModule],
  controllers: [AuditEventsController],
  providers: [
    { provide: AUDIT_RECORDER, useClass: MongoAuditRecorder },
    {
      provide: AUDIT_INGEST_SERVICE,
      useFactory: (recorder: AuditRecorder, users: UserRepository) =>
        new AuditIngestService(recorder, users),
      inject: [AUDIT_RECORDER, USER_REPOSITORY],
    },
  ],
  exports: [AUDIT_RECORDER],
})
export class AuditModule {}
