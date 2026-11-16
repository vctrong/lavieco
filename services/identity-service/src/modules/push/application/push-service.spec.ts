import { describe, expect, it } from "vitest";

import type { PushTopic } from "@lavieco/shared/identity";
import type { Role } from "@lavieco/shared/permissions";

import type { User, UserRepository } from "../../users";
import type {
  PushDeliveryLog,
  PushMessage,
  PushPreferenceRepository,
  PushSendResult,
  PushSender,
  PushSubscriptionRecord,
  PushSubscriptionRepository,
} from "./ports/push.ports";
import { PushService } from "./push-service";

function staff(id: string, roles: Role[], status: User["status"] = "active"): User {
  return {
    id,
    type: "staff",
    email: `${id}@lavieco.test`,
    emailNormalized: `${id}@lavieco.test`,
    displayName: id,
    roles,
    status,
    passwordHash: null,
    totp: null,
    recoveryCodes: [],
    googleSub: null,
    emailVerifiedAt: null,
    consent: null,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdAt: new Date(0),
  };
}

function setup(options: { available?: boolean; results?: Record<string, PushSendResult> } = {}) {
  const users = [
    staff("coord", ["coordinator"]),
    staff("editor", ["content_editor"]),
    staff("gone", ["coordinator"], "disabled"),
  ];
  const devices: PushSubscriptionRecord[] = [];
  const chosen = new Map<string, PushTopic[]>();
  const claimed = new Set<string>();
  const sent: { device: string; message: PushMessage }[] = [];
  let nextId = 0;

  const subscriptions: PushSubscriptionRepository = {
    async upsert(input) {
      const existing = devices.find((device) => device.endpoint === input.endpoint);
      if (existing) Object.assign(existing, input);
      else devices.push({ ...input, id: String((nextId += 1)), createdAt: new Date() });
    },
    async deleteForUser(userId, endpoint) {
      const index = devices.findIndex((d) => d.userId === userId && d.endpoint === endpoint);
      if (index >= 0) devices.splice(index, 1);
    },
    async deleteById(id) {
      const index = devices.findIndex((device) => device.id === id);
      if (index >= 0) devices.splice(index, 1);
    },
    async listByUsers(ids) {
      return devices.filter((device) => ids.includes(device.userId));
    },
    async markDelivered() {},
  };
  const preferences: PushPreferenceRepository = {
    async findTopics(userId) {
      return chosen.get(userId) ?? null;
    },
    async findTopicsForUsers(ids) {
      return new Map([...chosen].filter(([id]) => ids.includes(id)));
    },
    async setTopics(userId, topics) {
      chosen.set(userId, [...topics]);
    },
  };
  const deliveries: PushDeliveryLog = {
    async claim(id) {
      if (claimed.has(id)) return false;
      claimed.add(id);
      return true;
    },
  };
  const sender: PushSender = {
    available: options.available ?? true,
    publicKey: "public-key",
    async send(device, message) {
      const result = options.results?.[device.endpoint] ?? "sent";
      if (result === "sent") sent.push({ device: device.endpoint, message });
      return result;
    },
  };
  const userRepository = {
    findById: async (id: string) => users.find((user) => user.id === id) ?? null,
    listActiveStaff: async () => users.filter((user) => user.status === "active"),
  } as unknown as UserRepository;

  const service = new PushService(subscriptions, preferences, deliveries, sender, userRepository);
  return { service, devices, sent, chosen };
}

const keys = { p256dh: "p".repeat(87), auth: "a".repeat(22) };
const alert = {
  notificationId: "6f1c0d1e-7a4b-4c1e-9d55-2b8f3c9a1e01",
  topic: "order_paid" as const,
  title: "Đơn vé mới đã thanh toán",
  body: "Workshop vỏ sò · 2 vé",
  url: "/orders/abc",
};

describe("PushService", () => {
  it("alerts every device of the staff who may and want to see the topic", async () => {
    const { service, sent } = setup();
    await service.subscribe("coord", { endpoint: "https://push/1", keys, deviceLabel: "" });
    await service.subscribe("coord", { endpoint: "https://push/2", keys, deviceLabel: "" });
    await service.subscribe("editor", { endpoint: "https://push/3", keys, deviceLabel: "" });

    const result = await service.notify(alert);

    expect(result).toEqual({ sent: 2, duplicate: false });
    expect(sent.map((item) => item.device).sort()).toEqual(["https://push/1", "https://push/2"]);
  });

  it("never alerts twice for the same notification id (outbox retry)", async () => {
    const { service, sent } = setup();
    await service.subscribe("coord", { endpoint: "https://push/1", keys, deviceLabel: "" });
    await service.notify(alert);
    const again = await service.notify(alert);
    expect(again).toEqual({ sent: 0, duplicate: true });
    expect(sent).toHaveLength(1);
  });

  it("skips a topic the person turned off", async () => {
    const { service, sent } = setup();
    await service.subscribe("coord", { endpoint: "https://push/1", keys, deviceLabel: "" });
    await service.setTopics("coord", ["event_seats"]);
    await service.notify(alert);
    expect(sent).toHaveLength(0);
  });

  it("forgets a device the push service reports as gone", async () => {
    const { service, devices } = setup({ results: { "https://push/1": "gone" } });
    await service.subscribe("coord", { endpoint: "https://push/1", keys, deviceLabel: "" });
    await service.notify(alert);
    expect(devices).toHaveLength(0);
  });

  it("stores only topics the permissions allow", async () => {
    const { service, chosen } = setup();
    const settings = await service.setTopics("editor", ["order_paid"]);
    expect(chosen.get("editor")).toEqual([]);
    expect(settings.topics).toEqual([]);
  });

  it("refuses devices when the server has no VAPID keys, and sends nothing", async () => {
    const { service } = setup({ available: false });
    await expect(
      service.subscribe("coord", { endpoint: "https://push/1", keys, deviceLabel: "" }),
    ).rejects.toMatchObject({ code: "push.unavailable" });
    expect(await service.notify(alert)).toEqual({ sent: 0, duplicate: false });
  });

  it("refuses a disabled staff member", async () => {
    const { service } = setup();
    await expect(service.settings("gone")).rejects.toMatchObject({ code: "common.forbidden" });
  });
});
