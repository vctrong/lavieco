import { createIdentityClient, createServiceTokenSigner } from "@lavieco/api-clients";
import type { PushNotificationRequest } from "@lavieco/shared/identity";

import type { StaffAlertSink } from "../staff-alerts.tokens";

/** identity-service `POST /internal/v1/push-notifications`, with content-service's own token. */
export function createIdentityStaffAlertSink(options: {
  identityServiceUrl: string;
  privateJwk: string;
}): StaffAlertSink {
  const client = createIdentityClient({
    baseUrl: options.identityServiceUrl,
    signer: createServiceTokenSigner({ issuer: "content-service", privateJwk: options.privateJwk }),
  });
  return {
    async send(alert: PushNotificationRequest) {
      await client.sendPushNotification(alert);
    },
  };
}
