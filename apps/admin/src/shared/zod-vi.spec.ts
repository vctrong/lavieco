import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { acceptInviteSchema, secondFactorSchema, staffLoginSchema } from "@/features/auth/schemas";

/** Raw Zod wording (English defaults) that must never reach a form. */
const RAW = /Invalid|Expected|expected|received|Too (small|big)|Required/;

const SCHEMAS: [string, z.ZodType][] = [
  ["staff login", staffLoginSchema],
  ["second factor", secondFactorSchema],
  ["accept invite", acceptInviteSchema],
];

const INPUTS: unknown[] = [
  {},
  null,
  { email: 1, password: [], code: {}, token: 3, displayName: 9, totpCode: true },
  { email: "ban@", code: "12", token: "ngan", displayName: "", password: "x", totpCode: "1" },
];

describe("admin form schemas never show raw Zod messages", () => {
  it.each(SCHEMAS)("%s", (_name, schema) => {
    for (const input of INPUTS) {
      const parsed = schema.safeParse(input);
      if (parsed.success) continue;
      for (const issue of parsed.error.issues) {
        expect(issue.message, JSON.stringify(issue.path)).not.toMatch(RAW);
      }
    }
  });
});
