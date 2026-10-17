import { Inject, Injectable, type OnApplicationBootstrap } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import type { Logger } from "@lavieco/observability";
import { LOGGER } from "@lavieco/service-kit";

import { SIGNING_KEY_MODEL } from "./signing-key.model";
import { SigningKeyStore } from "./signing-key-store";

export const SIGNING_KEY_STORE = Symbol("SIGNING_KEY_STORE");

/** Records the public keys in use at start-up (best effort: never blocks boot). */
@Injectable()
export class SigningKeyRegistry implements OnApplicationBootstrap {
  constructor(
    @InjectModel(SIGNING_KEY_MODEL) private readonly model: Model<unknown>,
    @Inject(SIGNING_KEY_STORE) private readonly store: SigningKeyStore,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async onApplicationBootstrap() {
    const now = new Date();
    try {
      for (const jwk of this.store.publicKeySet().keys) {
        await this.model.updateOne(
          { kid: jwk.kid },
          {
            $setOnInsert: {
              schemaVersion: 1,
              kid: jwk.kid,
              alg: "EdDSA",
              publicJwk: jwk,
              firstSeenAt: now,
            },
            $set: { lastSeenAt: now },
          },
          { upsert: true },
        );
      }
    } catch (error) {
      this.logger.warn("could not record signing key metadata", { error });
    }
  }
}
