import { Module } from "@nestjs/common";

import { UNIT_OF_WORK } from "@lavieco/service-kit";
import type { UnitOfWork } from "@lavieco/service-kit/ports";

import { AUDIT_RECORDER, AuditModule, type AuditRecorder } from "../audit";
import { PASSWORD_HASHER, SECRET_BOX, type PasswordHasher, type SecretBox } from "../security";
import { USER_REPOSITORY, UsersModule, type UserRepository } from "../users";
import { InvitationsController } from "./api/invitations.controller";
import { InvitationService } from "./application/invitation-service";
import {
  INVITATION_REPOSITORY,
  type InvitationRepository,
} from "./application/ports/invitation-repository.port";
import { invitationPersistence } from "./infrastructure/invitation.model";
import { MongoInvitationRepository } from "./infrastructure/invitation.repository";
import { INVITATION_SERVICE } from "./invitations.tokens";

@Module({
  imports: [invitationPersistence, UsersModule, AuditModule],
  controllers: [InvitationsController],
  providers: [
    { provide: INVITATION_REPOSITORY, useClass: MongoInvitationRepository },
    {
      provide: INVITATION_SERVICE,
      useFactory: (
        invitations: InvitationRepository,
        users: UserRepository,
        hasher: PasswordHasher,
        secretBox: SecretBox,
        unitOfWork: UnitOfWork,
        audit: AuditRecorder,
      ) => new InvitationService(invitations, users, hasher, secretBox, unitOfWork, audit),
      inject: [
        INVITATION_REPOSITORY,
        USER_REPOSITORY,
        PASSWORD_HASHER,
        SECRET_BOX,
        UNIT_OF_WORK,
        AUDIT_RECORDER,
      ],
    },
  ],
  exports: [INVITATION_SERVICE],
})
export class InvitationsModule {}
