import webPush, { WebPushError } from "web-push";

import type { Logger } from "@lavieco/observability";

import type {
  PushMessage,
  PushSendResult,
  PushSender,
  PushSubscriptionRecord,
} from "../application/ports/push.ports";

/** A missed alert is worthless after a day; push services drop it then. */
const TTL_SECONDS = 24 * 60 * 60;

export type VapidConfig = { publicKey: string; privateKey: string; subject: string };

/**
 * Sends through the browser vendors' push services with VAPID (RFC 8292), payload
 * encrypted for the device (RFC 8291) by `web-push`. Never logs the endpoint or the
 * message: only the push service's status code.
 */
export class WebPushSender implements PushSender {
  readonly available: boolean;
  readonly publicKey: string | null;

  constructor(
    private readonly vapid: VapidConfig,
    private readonly logger: Logger,
  ) {
    this.available = vapid.publicKey !== "" && vapid.privateKey !== "";
    this.publicKey = this.available ? vapid.publicKey : null;
  }

  async send(subscription: PushSubscriptionRecord, message: PushMessage): Promise<PushSendResult> {
    if (!this.available) return "failed";
    try {
      await webPush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        JSON.stringify(message),
        {
          TTL: TTL_SECONDS,
          urgency: "high",
          topic: message.tag?.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined,
          vapidDetails: this.vapid,
          timeout: 5_000,
        },
      );
      return "sent";
    } catch (error) {
      const status = error instanceof WebPushError ? error.statusCode : null;
      // 404/410: the browser unsubscribed or the app was removed; forget the device.
      if (status === 404 || status === 410) return "gone";
      this.logger.warn("push delivery failed", { status, subscriptionId: subscription.id });
      return "failed";
    }
  }
}
