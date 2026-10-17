import { DomainError } from "@lavieco/shared";

import type { PaymentGateway } from "../application/ports/order-services.port";

/** Stands in when payOS is not configured: free events work, paid ones refuse to book. */
export class DisabledPaymentGateway implements PaymentGateway {
  readonly enabled = false;

  createLink(): never {
    throw new DomainError("payment.unavailable");
  }

  getStatus(): never {
    throw new DomainError("payment.unavailable");
  }

  cancel(): never {
    throw new DomainError("payment.unavailable");
  }

  verifyWebhook(): never {
    throw new DomainError("payment.signature_invalid");
  }
}
