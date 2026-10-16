import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { base32Decode, base32Encode } from "./base32";

/** TOTP parameters (RFC 6238), the defaults every authenticator app supports. */
export const TOTP = { periodSeconds: 30, digits: 6, secretBytes: 20, window: 1 } as const;

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(TOTP.secretBytes));
}

export function timeStep(at: Date): number {
  return Math.floor(at.getTime() / 1000 / TOTP.periodSeconds);
}

/** HOTP value (RFC 4226) for one counter, as a zero-padded string. */
export function hotp(secret: Buffer, counter: number, digits: number = TOTP.digits): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!;
  return String(binary % 10 ** digits).padStart(digits, "0");
}

/**
 * Checks a code against the current step ±`window` (clock drift). Returns the
 * matching step so the caller can refuse a step already used (`lastUsedStep`,
 * docs/03 §4.1: a code cannot be replayed), or `null` when nothing matches.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  at: Date,
  lastUsedStep: number | null,
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretBase32);
  const current = timeStep(at);
  for (let step = current - TOTP.window; step <= current + TOTP.window; step += 1) {
    if (lastUsedStep !== null && step <= lastUsedStep) continue;
    const expected = Buffer.from(hotp(secret, step));
    if (timingSafeEqual(expected, Buffer.from(code))) return step;
  }
  return null;
}

/** `otpauth://` URI rendered as a QR code by the admin app during 2FA setup. */
export function otpauthUri(
  secretBase32: string,
  account: string,
  issuer = "LAVIECO Admin",
): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP.digits),
    period: String(TOTP.periodSeconds),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
