import { Module } from "@nestjs/common";

import { AUDIT_RECORDER } from "./application/ports/audit-recorder.port";
import { auditPersistence } from "./infrastructure/audit-event.model";
import { MongoAuditRecorder } from "./infrastructure/mongo-audit-recorder";

// TODO(UC-29): read endpoint for the audit log (`audit:read`), with the admin screen.
@Module({
  imports: [auditPersistence],
  providers: [{ provide: AUDIT_RECORDER, useClass: MongoAuditRecorder }],
  exports: [AUDIT_RECORDER],
})
export class AuditModule {}
