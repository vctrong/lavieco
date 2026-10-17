import type { TokenVerifier } from "@lavieco/service-kit";
import type { OtpPurpose } from "@lavieco/shared/identity";

import type { EmailProofVerifier } from "../application/ports/order-services.port";

/** identity-service email proofs, verified with its JWKS (ADR-0021). */
export class JwksEmailProofVerifier implements EmailProofVerifier {
  constructor(private readonly tokens: TokenVerifier) {}

  verify(token: string, purpose: OtpPurpose) {
    return this.tokens.verifyEmailProof(token, purpose);
  }
}
