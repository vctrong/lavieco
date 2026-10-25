import { z } from "zod";

import {
  HISTORY_LIMITS,
  storedConversationSchema,
  type ChatHistoryStore,
  type ConversationSummary,
  type StoredConversation,
} from "./chat-history-store";

export const HISTORY_STORAGE_KEY = "lavieco.laviagent.history.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const fileSchema = z.object({
  schemaVersion: z.literal(1),
  conversations: z.array(z.unknown()),
});

/** `window.localStorage`, or null where it is missing or blocked (private mode, SSR). */
function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

const byNewest = (a: { updatedAt: string }, b: { updatedAt: string }) =>
  b.updatedAt.localeCompare(a.updatedAt);

/**
 * Conversations on the visitor's device only (docs/07 §4.3). Every access is guarded:
 * a full, blocked or corrupted storage never breaks the chat, it just keeps less.
 */
export class LocalChatHistoryStore implements ChatHistoryStore {
  constructor(private readonly storage: () => StorageLike | null = browserStorage) {}

  async list(): Promise<ConversationSummary[]> {
    return this.read().map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      material: conversation.material,
      ideaId: conversation.ideaId,
    }));
  }

  async get(id: string): Promise<StoredConversation | null> {
    return this.read().find((conversation) => conversation.id === id) ?? null;
  }

  async save(conversation: StoredConversation): Promise<void> {
    const parsed = storedConversationSchema.safeParse(conversation);
    if (!parsed.success) return;
    const others = this.read().filter((item) => item.id !== conversation.id);
    this.write([parsed.data, ...others]);
  }

  async remove(id: string): Promise<void> {
    this.write(this.read().filter((item) => item.id !== id));
  }

  private read(): StoredConversation[] {
    try {
      const raw = this.storage()?.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const file = fileSchema.safeParse(JSON.parse(raw));
      if (!file.success) return [];
      return file.data.conversations
        .flatMap((item) => {
          const parsed = storedConversationSchema.safeParse(item);
          return parsed.success ? [parsed.data] : [];
        })
        .sort(byNewest);
    } catch {
      return [];
    }
  }

  /** Newest first, capped; on a full storage the oldest conversations go until it fits. */
  private write(conversations: StoredConversation[]) {
    const storage = this.storage();
    if (!storage) return;
    let kept = [...conversations].sort(byNewest).slice(0, HISTORY_LIMITS.conversations);
    while (kept.length > 0) {
      try {
        storage.setItem(
          HISTORY_STORAGE_KEY,
          JSON.stringify({ schemaVersion: 1, conversations: kept }),
        );
        return;
      } catch {
        kept = kept.slice(0, -1);
      }
    }
    try {
      storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, conversations: [] }));
    } catch {
      // Storage refuses everything: history is simply not kept.
    }
  }
}
