import { z } from "zod";

import { classifyResultSchema, materialIdSchema } from "../schemas";
import type { AgentMessage, MaterialId } from "../types";

/**
 * Where conversations are kept (docs/07 §4.3). The demo keeps them on the visitor's
 * device (LocalChatHistoryStore). TODO(laviagent-server-history): a
 * ServerChatHistoryStore behind the same type, synced per member account (MongoDB,
 * through a service), once members sign in to LaviAgent; the methods are async for it.
 */
export type ChatHistoryStore = {
  list(): Promise<ConversationSummary[]>;
  get(id: string): Promise<StoredConversation | null>;
  save(conversation: StoredConversation): Promise<void>;
  remove(id: string): Promise<void>;
};

export type StoredConversation = {
  id: string;
  title: string;
  /** ISO 8601 UTC. */
  createdAt: string;
  updatedAt: string;
  material: MaterialId | null;
  ideaId: string | null;
  messages: AgentMessage[];
};

export type ConversationSummary = Omit<StoredConversation, "messages">;

export const HISTORY_LIMITS = {
  conversations: 30,
  messagesPerConversation: 60,
  /** A ~96px JPEG thumbnail as a data URL is a few KB; anything bigger is not stored. */
  thumbnailMaxChars: 24_000,
} as const;

const SAMPLE_PREFIX = "/images/laviagent/";
const THUMBNAIL_PREFIX = "data:image/jpeg;base64,";

const pickReasonSchema = z.enum([
  "offline",
  "unknown",
  "failed",
  "timeout",
  "network",
  "rate_limited",
]);

/** Only these parts are stored; anything else (reasoning, steps, big images) is dropped. */
const storedPartSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string().max(8_000) }),
  z.object({
    type: z.literal("file"),
    mediaType: z.string().startsWith("image/"),
    url: z
      .string()
      .refine(
        (url) =>
          url.startsWith(SAMPLE_PREFIX) ||
          (url.startsWith(THUMBNAIL_PREFIX) && url.length <= HISTORY_LIMITS.thumbnailMaxChars),
      ),
  }),
  z.object({
    type: z.literal("data-analysis"),
    data: z.object({
      material: materialIdSchema,
      source: z.enum(["ai", "sample", "manual"]),
      result: classifyResultSchema.nullable(),
    }),
  }),
  z.object({ type: z.literal("data-hazard"), data: z.object({ result: classifyResultSchema }) }),
  z.object({ type: z.literal("data-picker"), data: z.object({ reason: pickReasonSchema }) }),
]);

const storedMessageSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.unknown()).transform((parts) =>
    parts.flatMap((part) => {
      const parsed = storedPartSchema.safeParse(part);
      return parsed.success ? [parsed.data] : [];
    }),
  ),
  metadata: z.object({ fallback: z.boolean().optional() }).optional(),
});

export const storedConversationSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().max(120),
  createdAt: z.string(),
  updatedAt: z.string(),
  material: materialIdSchema.nullable(),
  ideaId: z.string().max(60).nullable(),
  messages: z.array(z.unknown()).transform((messages) => sanitizeMessages(messages)),
});

/**
 * What may be kept of a conversation: known parts only, small thumbnails only (never a
 * full photo), no empty messages, the last `messagesPerConversation` messages.
 */
export function sanitizeMessages(messages: readonly unknown[]): AgentMessage[] {
  const kept = messages.flatMap((message) => {
    const parsed = storedMessageSchema.safeParse(message);
    if (!parsed.success || parsed.data.parts.length === 0) return [];
    return [parsed.data as AgentMessage];
  });
  return kept.slice(-HISTORY_LIMITS.messagesPerConversation);
}
