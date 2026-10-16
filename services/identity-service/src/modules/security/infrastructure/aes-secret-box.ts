import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { SecretBox } from "../application/ports/security.port";

const VERSION = "v1";

/**
 * AES-256-GCM with a key from the secret store (`TOTP_ENCRYPTION_KEY`), never from
 * the DB (docs/03 §8.3). Format: `v1.<iv>.<tag>.<ciphertext>` in base64url.
 */
export class AesSecretBox implements SecretBox {
  private readonly key: Buffer;

  constructor(keyBase64: string) {
    const key = Buffer.from(keyBase64, "base64");
    if (key.length < 32) throw new Error("Encryption key must be 32 bytes");
    this.key = key.subarray(0, 32);
  }

  seal(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return [VERSION, iv, cipher.getAuthTag(), data]
      .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
      .join(".");
  }

  open(sealed: string): string {
    const [version, iv, tag, data] = sealed.split(".");
    if (version !== VERSION || !iv || !tag || !data) throw new Error("Unknown sealed format");
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
