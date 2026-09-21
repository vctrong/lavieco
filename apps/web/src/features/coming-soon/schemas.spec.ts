import { describe, expect, it } from "vitest";

import { waitlistSchema } from "./schemas";

const valid = { email: "lan@example.com", consent: "yes" };

describe("waitlistSchema", () => {
  it("accepts a well-formed email with consent", () => {
    expect(waitlistSchema.safeParse(valid).success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const parsed = waitlistSchema.parse({ ...valid, email: "  lan@example.com " });
    expect(parsed.email).toBe("lan@example.com");
  });

  it.each([
    "",
    "   ",
    "lan",
    "lan@",
    "@example.com",
    "lan@example",
    "a@b@c.com",
    "lan @example.com",
  ])("rejects %j as an email", (email) => {
    expect(waitlistSchema.safeParse({ ...valid, email }).success).toBe(false);
  });

  it("requires consent (BR-06)", () => {
    expect(waitlistSchema.safeParse({ email: valid.email }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(waitlistSchema.safeParse({ ...valid, website: "spam" }).success).toBe(false);
  });
});
