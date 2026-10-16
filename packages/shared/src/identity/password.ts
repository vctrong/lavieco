import { z } from "zod";

/** Length bounds of a password (docs/02 §9.2). Argon2id hashing happens in identity-service. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

export const emailSchema = z.string().trim().max(254).pipe(z.email());

export const displayNameSchema = z.string().trim().min(1).max(80);
