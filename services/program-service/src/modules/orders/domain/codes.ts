import { randomBytes, randomInt } from "node:crypto";

/** Crockford Base32 without I, L, O, U: no look-alike characters on a ticket. */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * payOS `orderCode`: a positive integer, unique, random (not sequential, so order
 * volumes cannot be read from it). 10 digits stay well inside a safe JS integer.
 */
export function newOrderCode(): number {
  return randomInt(1_000_000_000, 9_999_999_999);
}

/** Short code printed on the ticket and typed at the door, e.g. `LVC-7K3Q9M`. */
export function newTicketCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) code += CROCKFORD[randomInt(0, CROCKFORD.length)];
  return `LVC-${code}`;
}

/** What the ticket QR encodes: 32 random bytes, base64url, no personal data (docs/05 §7). */
export function newQrToken(): string {
  return randomBytes(32).toString("base64url");
}
