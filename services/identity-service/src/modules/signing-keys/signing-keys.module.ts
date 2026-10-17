import { type DynamicModule, Global, Module } from "@nestjs/common";

import { TOKEN_SIGNER } from "./application/ports/token-signer.port";
import { JwksController } from "./api/jwks.controller";
import { signingKeyPersistence } from "./infrastructure/signing-key.model";
import { SIGNING_KEY_STORE, SigningKeyRegistry } from "./infrastructure/signing-key-registry";
import type { SigningKeyStore } from "./infrastructure/signing-key-store";

@Global()
@Module({})
export class SigningKeysModule {
  /** The store is built once in `main`/tests so the auth guard can share its resolver. */
  static forRoot(store: SigningKeyStore): DynamicModule {
    return {
      module: SigningKeysModule,
      imports: [signingKeyPersistence],
      controllers: [JwksController],
      providers: [
        { provide: SIGNING_KEY_STORE, useValue: store },
        { provide: TOKEN_SIGNER, useValue: store },
        SigningKeyRegistry,
      ],
      exports: [TOKEN_SIGNER],
    };
  }
}
