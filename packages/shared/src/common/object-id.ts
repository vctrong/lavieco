import { z } from "zod";

/** A MongoDB ObjectId as it travels over HTTP: 24 lowercase hex characters. */
export const objectIdSchema = z.string().regex(/^[0-9a-f]{24}$/, "Expected a 24-character hex id");

/** An ISO 8601 UTC timestamp as it travels over HTTP (docs/02 §6.1). */
export const isoDateTimeSchema = z.iso.datetime();
