import { hash, verify } from "@node-rs/argon2";

import type { PasswordHasher } from "../application/ports/security.port";

/** OWASP baseline for Argon2id: 19 MiB, 2 iterations, 1 lane. */
// `Algorithm` is an ambient const enum (unusable with isolatedModules): 2 = Argon2id.
const OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export class Argon2PasswordHasher implements PasswordHasher {
  private dummyHash: Promise<string> | null = null;

  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  async verifyDummy(password: string): Promise<void> {
    this.dummyHash ??= hash("lavieco-timing-equalizer", OPTIONS);
    await this.verify(await this.dummyHash, password);
  }
}
