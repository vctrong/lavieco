import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** High-entropy opaque token (refresh tokens, invitation links): 32 random bytes, base64url. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Storage form of a high-entropy secret: SHA-256 is enough because the input
 * cannot be brute-forced. Passwords use Argon2id instead (docs/03 §8.3).
 */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

/** Keyed hash for LOW-entropy values (6-digit OTP codes, rate-limit keys). */
export function hmacSha256(key: Buffer, value: string): string {
  return createHmac("sha256", key).update(value).digest("base64url");
}

export function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Uniform 6-digit code, leading zeros allowed. */
export function randomDigits(length = 6): string {
  let out = "";
  for (let index = 0; index < length; index += 1) out += String(randomInt(0, 10));
  return out;
}

const RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** One-time 2FA recovery codes `xxxxx-xxxxx`, shown once, stored hashed (docs/03 §4.1). */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const chars = Array.from(
      { length: 10 },
      () => RECOVERY_ALPHABET[randomInt(0, RECOVERY_ALPHABET.length)],
    ).join("");
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}
