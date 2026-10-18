import { createIdentityClient, createServiceTokenSigner } from "@lavieco/api-clients";
import type { AuditEventIngestRequest } from "@lavieco/shared/identity";

import type { AuditSink } from "../audit.tokens";

/** identity-service `POST /internal/v1/audit-events`, with program-service's own service token. */
export function createIdentityAuditSink(options: {
  identityServiceUrl: string;
  privateJwk: string;
}): AuditSink {
  const client = createIdentityClient({
    baseUrl: options.identityServiceUrl,
    signer: createServiceTokenSigner({ issuer: "program-service", privateJwk: options.privateJwk }),
  });
  return {
    async send(event: AuditEventIngestRequest) {
      await client.recordAuditEvent(event, event.requestId ?? undefined);
    },
  };
}
