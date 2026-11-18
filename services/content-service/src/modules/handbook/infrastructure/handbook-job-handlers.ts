import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";

import { OutboxWorker } from "@lavieco/service-kit";
import { HANDBOOK_CACHE_TAG } from "@lavieco/shared/content";

import { STAFF_ALERT_SINK, type StaffAlertSink } from "../../staff-alerts";
import { HANDBOOK_PUBLISHED_JOB } from "../application/handbook-editor";
import {
  HANDBOOK_REPOSITORY,
  type HandbookRepository,
} from "../application/ports/handbook-repository.port";
import { publishAlert } from "../domain/publish-alert";
import { HANDBOOK_REVALIDATE } from "../handbook.tokens";

export type RevalidateTags = (body: { tags: string[] }) => Promise<void>;

/**
 * After a publish or restore: the web cache of the handbook is dropped, then the team
 * is alerted (D1). Retried by the outbox until both succeed; the alert id is stable,
 * so a retry never notifies twice.
 */
@Injectable()
export class HandbookJobHandlers implements OnModuleInit {
  constructor(
    private readonly worker: OutboxWorker,
    @Inject(HANDBOOK_REPOSITORY) private readonly handbooks: HandbookRepository,
    @Inject(STAFF_ALERT_SINK) private readonly alerts: StaffAlertSink,
    @Inject(HANDBOOK_REVALIDATE) private readonly revalidate: RevalidateTags,
  ) {}

  onModuleInit() {
    this.worker.register(HANDBOOK_PUBLISHED_JOB, async (payload) => {
      await this.revalidate({ tags: [HANDBOOK_CACHE_TAG] });
      const version = await this.handbooks.findVersion(String(payload.versionId));
      if (!version) return;
      const restoredFrom = typeof payload.restoredFrom === "number" ? payload.restoredFrom : null;
      await this.alerts.send(publishAlert(version, restoredFrom));
    });
  }
}
