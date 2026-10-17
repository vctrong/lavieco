import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";

import { EMAIL_SENDER, OutboxWorker, SERVICE_CONFIG } from "@lavieco/service-kit";
import type { EmailSender } from "@lavieco/service-kit/ports";

import type { IdentityEnv } from "../../config/env";
import { PASSWORD_CHANGED_JOB } from "../auth";
import { USER_REPOSITORY, type UserRepository } from "../users";
import { passwordChangedEmail } from "./password-changed.template";

/**
 * Registers identity-service's outbox handlers (docs/04 §6.5). Payloads carry IDs
 * only; personal data (the email address) is read when the job runs.
 */
@Injectable()
export class IdentityOutboxHandlers implements OnModuleInit {
  constructor(
    private readonly worker: OutboxWorker,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(SERVICE_CONFIG) private readonly env: IdentityEnv,
  ) {}

  onModuleInit() {
    this.worker.register(PASSWORD_CHANGED_JOB, async (payload) => {
      const user = await this.users.findById(String(payload.userId));
      if (!user) return; // account removed meanwhile: nothing to notify
      await this.email.send({ to: user.email, ...passwordChangedEmail(this.env.WEB_APP_URL) });
    });
  }
}
