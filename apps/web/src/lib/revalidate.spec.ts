import { createHmac, randomBytes } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { verifyRevalidateSignature } = await import("./revalidate");

const secret = randomBytes(32).toString("base64");
const body = JSON.stringify({ tags: ["program:events"] });
const sign = (timestamp: string, raw = body, key = secret) =>
  createHmac("sha256", Buffer.from(key, "base64")).update(`${timestamp}.${raw}`).digest("hex");

describe("verifyRevalidateSignature", () => {
  const now = 1_800_000_000;

  it("accepts a fresh, correctly signed body", () => {
    const timestamp = String(now);
    expect(
      verifyRevalidateSignature({
        secret,
        timestamp,
        signature: sign(timestamp),
        rawBody: body,
        nowSeconds: now,
      }),
    ).toBe(true);
  });

  it("refuses a tampered body, another key, an old timestamp or no secret", () => {
    const timestamp = String(now);
    const base = { secret, timestamp, signature: sign(timestamp), nowSeconds: now };
    expect(verifyRevalidateSignature({ ...base, rawBody: `${body} ` })).toBe(false);
    expect(
      verifyRevalidateSignature({
        ...base,
        rawBody: body,
        signature: sign(timestamp, body, randomBytes(32).toString("base64")),
      }),
    ).toBe(false);
    const old = String(now - 600);
    expect(
      verifyRevalidateSignature({ ...base, timestamp: old, signature: sign(old), rawBody: body }),
    ).toBe(false);
    expect(verifyRevalidateSignature({ ...base, secret: "", rawBody: body })).toBe(false);
  });
});
