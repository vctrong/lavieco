import { z } from "zod";

import "@/shared/zod-vi";

import { TEXT } from "./constants/text";

const v = TEXT.vi.validation;

export const staffLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: v.emailRequired })
    .pipe(z.email({ error: v.email })),
  password: z.string().min(1, { error: v.password }).max(256),
});

export const secondFactorSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^(\d{6}|[a-z0-9]{5}-[a-z0-9]{5})$/, { error: v.code }),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20).max(200),
  displayName: z.string().trim().min(1, { error: v.displayName }).max(80, { error: v.displayName }),
  password: z.string().min(8, { error: v.newPassword }).max(128, { error: v.newPassword }),
  totpCode: z.string().regex(/^\d{6}$/, { error: v.totpCode }),
});
