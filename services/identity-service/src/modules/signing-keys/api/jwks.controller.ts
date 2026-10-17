import { Controller, Get, Header, Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { PublicEndpoint } from "@lavieco/service-kit";

import { SIGNING_KEY_STORE } from "../infrastructure/signing-key-registry";
import { SigningKeyStore } from "../infrastructure/signing-key-store";

/**
 * Public keys used by the other services to verify user tokens (docs/02 §6.3).
 * Reachable on the private network only, like every service route.
 */
@ApiTags("jwks")
@Controller(".well-known")
export class JwksController {
  constructor(@Inject(SIGNING_KEY_STORE) private readonly store: SigningKeyStore) {}

  @Get("jwks.json")
  @PublicEndpoint()
  @Header("cache-control", "public, max-age=300")
  @ApiOperation({ summary: "JWKS of identity-service (Ed25519 public keys)" })
  jwks() {
    return this.store.publicKeySet();
  }
}
