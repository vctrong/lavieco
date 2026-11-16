import { Module } from "@nestjs/common";

import { LOGGER, SERVICE_CONFIG } from "@lavieco/service-kit";
import type { Logger } from "@lavieco/observability";

import type { IdentityEnv } from "../../config/env";
import { USER_REPOSITORY, UsersModule, type UserRepository } from "../users";
import { PushNotificationsController, StaffPushController } from "./api/staff-push.controller";
import {
  PUSH_DELIVERY_LOG,
  PUSH_PREFERENCE_REPOSITORY,
  PUSH_SENDER,
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushDeliveryLog,
  type PushPreferenceRepository,
  type PushSender,
  type PushSubscriptionRepository,
} from "./application/ports/push.ports";
import { PushService } from "./application/push-service";
import { pushPersistence } from "./infrastructure/push.models";
import {
  MongoPushDeliveryLog,
  MongoPushPreferenceRepository,
  MongoPushSubscriptionRepository,
} from "./infrastructure/push.repositories";
import { WebPushSender } from "./infrastructure/web-push-sender";
import { PUSH_SERVICE } from "./push.tokens";

/** Staff alerts by Web Push (ADR-0027). */
@Module({
  imports: [pushPersistence, UsersModule],
  controllers: [StaffPushController, PushNotificationsController],
  providers: [
    { provide: PUSH_SUBSCRIPTION_REPOSITORY, useClass: MongoPushSubscriptionRepository },
    { provide: PUSH_PREFERENCE_REPOSITORY, useClass: MongoPushPreferenceRepository },
    { provide: PUSH_DELIVERY_LOG, useClass: MongoPushDeliveryLog },
    {
      provide: PUSH_SENDER,
      useFactory: (env: IdentityEnv, logger: Logger) =>
        new WebPushSender(
          {
            publicKey: env.WEB_PUSH_VAPID_PUBLIC_KEY,
            privateKey: env.WEB_PUSH_VAPID_PRIVATE_KEY,
            subject: env.WEB_PUSH_SUBJECT,
          },
          logger,
        ),
      inject: [SERVICE_CONFIG, LOGGER],
    },
    {
      provide: PUSH_SERVICE,
      useFactory: (
        subscriptions: PushSubscriptionRepository,
        preferences: PushPreferenceRepository,
        deliveries: PushDeliveryLog,
        sender: PushSender,
        users: UserRepository,
      ) => new PushService(subscriptions, preferences, deliveries, sender, users),
      inject: [
        PUSH_SUBSCRIPTION_REPOSITORY,
        PUSH_PREFERENCE_REPOSITORY,
        PUSH_DELIVERY_LOG,
        PUSH_SENDER,
        USER_REPOSITORY,
      ],
    },
  ],
})
export class PushModule {}
