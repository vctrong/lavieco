/**
 * Keys whose values never reach a log line (S7, docs/02 §9.4): personal data
 * (name, email, phone, message) and secrets (passwords, tokens, codes, cookies).
 * Matched case-insensitively at any depth.
 */
export const SENSITIVE_KEYS = [
  "password",
  "newpassword",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "mfatoken",
  "verificationtoken",
  "idtoken",
  "code",
  "codeverifier",
  "totpcode",
  "secret",
  "authorization",
  "cookie",
  "set-cookie",
  "email",
  "emailnormalized",
  "phone",
  "phonenormalized",
  "name",
  "displayname",
  "fullname",
  "message",
  "note",
  "address",
  "clientip",
  "ip",
] as const;

export const REDACTED = "[redacted]";

const SENSITIVE = new Set<string>(SENSITIVE_KEYS);
const MAX_DEPTH = 8;

/** Deep copy of `value` with every sensitive key replaced by `[redacted]`. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = SENSITIVE.has(key.toLowerCase()) ? REDACTED : redact(inner, depth + 1);
  }
  return out;
}
