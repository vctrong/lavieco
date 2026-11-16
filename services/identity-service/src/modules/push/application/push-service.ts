import { DomainError } from "@lavieco/shared";
import type {
  PushNotificationRequest,
  PushNotificationResponse,
  PushSettings,
  PushSubscriptionRequest,
  PushTopic,
} from "@lavieco/shared/identity";

import type { UserRepository } from "../../users";
import {
  MAX_DEVICES_PER_USER,
  allowedTopics,
  effectiveTopics,
  wantsTopic,
} from "../domain/push-topics";
import type {
  PushDeliveryLog,
  PushMessage,
  PushPreferenceRepository,
  PushSender,
  PushSubscriptionRecord,
  PushSubscriptionRepository,
} from "./ports/push.ports";

/** Copy of the test notification (staff-only, Vietnamese like every alert). */
const TEST_MESSAGE: PushMessage = {
  title: "LAVIECO: thông báo đã bật",
  body: "Máy này sẽ nhận thông báo đơn vé, đăng ký và chỗ ngồi.",
  url: "/notifications",
  tag: "test",
};

/**
 * Staff alerts by Web Push (ADR-0027): devices, topic choices, and fan-out of one
 * alert from another service to every device of every staff member who wants it.
 * Sending never throws for one device: a dead subscription is removed, a failed one
 * is skipped, so an outbox retry never alerts the others twice.
 */
export class PushService {
  constructor(
    private readonly subscriptions: PushSubscriptionRepository,
    private readonly preferences: PushPreferenceRepository,
    private readonly deliveries: PushDeliveryLog,
    private readonly sender: PushSender,
    private readonly users: UserRepository,
  ) {}

  async settings(userId: string): Promise<PushSettings> {
    const user = await this.staff(userId);
    const [chosen, devices] = await Promise.all([
      this.preferences.findTopics(userId),
      this.subscriptions.listByUsers([userId]),
    ]);
    return {
      available: this.sender.available,
      vapidPublicKey: this.sender.publicKey,
      allowedTopics: allowedTopics(user.roles),
      topics: effectiveTopics(user.roles, chosen),
      devices: devices
        .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((device) => ({
          deviceLabel: device.deviceLabel,
          createdAt: device.createdAt.toISOString(),
        })),
    };
  }

  async setTopics(userId: string, topics: readonly PushTopic[], now = new Date()) {
    const user = await this.staff(userId);
    // Stored as chosen; what is sent is always cut down to the current permissions.
    const allowed = new Set(allowedTopics(user.roles));
    await this.preferences.setTopics(
      userId,
      [...new Set(topics)].filter((topic) => allowed.has(topic)),
      now,
    );
    return this.settings(userId);
  }

  async subscribe(userId: string, input: PushSubscriptionRequest, now = new Date()) {
    if (!this.sender.available) throw new DomainError("push.unavailable");
    await this.staff(userId);
    await this.subscriptions.upsert(
      { userId, endpoint: input.endpoint, keys: input.keys, deviceLabel: input.deviceLabel },
      MAX_DEVICES_PER_USER,
      now,
    );
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.subscriptions.deleteForUser(userId, endpoint);
  }

  /** "Gửi thử" on the settings screen: every device of the caller, whatever the topics. */
  async sendTest(userId: string, now = new Date()): Promise<{ sent: number }> {
    if (!this.sender.available) throw new DomainError("push.unavailable");
    await this.staff(userId);
    const devices = await this.subscriptions.listByUsers([userId]);
    return { sent: await this.deliver(devices, TEST_MESSAGE, now) };
  }

  async notify(
    request: PushNotificationRequest,
    now = new Date(),
  ): Promise<PushNotificationResponse> {
    if (!this.sender.available) return { sent: 0, duplicate: false };
    if (!(await this.deliveries.claim(request.notificationId, now))) {
      return { sent: 0, duplicate: true };
    }
    const staff = await this.users.listActiveStaff();
    const chosen = await this.preferences.findTopicsForUsers(staff.map((user) => user.id));
    const recipients = staff
      .filter((user) => wantsTopic(user.roles, chosen.get(user.id) ?? null, request.topic))
      .map((user) => user.id);
    if (recipients.length === 0) return { sent: 0, duplicate: false };
    const devices = await this.subscriptions.listByUsers(recipients);
    const sent = await this.deliver(
      devices,
      { title: request.title, body: request.body, url: request.url, tag: request.tag },
      now,
    );
    return { sent, duplicate: false };
  }

  private async deliver(devices: PushSubscriptionRecord[], message: PushMessage, now: Date) {
    const results = await Promise.all(
      devices.map(async (device) => {
        const result = await this.sender.send(device, message);
        if (result === "gone") await this.subscriptions.deleteById(device.id);
        if (result === "sent") await this.subscriptions.markDelivered(device.id, now);
        return result;
      }),
    );
    return results.filter((result) => result === "sent").length;
  }

  private async staff(userId: string) {
    const user = await this.users.findById(userId);
    if (!user || user.type !== "staff" || user.status !== "active") {
      throw new DomainError("common.forbidden");
    }
    return user;
  }
}
