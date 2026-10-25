import { describe, expect, it } from "vitest";

import type { AgentMessage } from "../types";
import { HISTORY_LIMITS, type StoredConversation } from "./chat-history-store";
import { HISTORY_STORAGE_KEY, LocalChatHistoryStore } from "./local-chat-history-store";

/** An in-memory Storage that can be told to refuse writes above a size (quota). */
function memoryStorage(maxChars = Number.POSITIVE_INFINITY) {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (value.length > maxChars) throw new DOMException("full", "QuotaExceededError");
      data.set(key, value);
    },
  };
}

const text = (id: string, role: "user" | "assistant", value: string): AgentMessage => ({
  id,
  role,
  parts: [{ type: "text", text: value }],
});

const conversation = (id: string, minutesAgo: number, messages: AgentMessage[] = []) =>
  ({
    id,
    title: `Cuộc ${id}`,
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    material: null,
    ideaId: null,
    messages: messages.length ? messages : [text(`${id}-1`, "user", "Xin chào")],
  }) satisfies StoredConversation;

describe("LocalChatHistoryStore", () => {
  it("saves, reads back and lists newest first", async () => {
    const store = new LocalChatHistoryStore(() => memoryStorage());
    const shared = memoryStorage();
    const sameStore = new LocalChatHistoryStore(() => shared);
    await sameStore.save(conversation("a", 10));
    await sameStore.save(conversation("b", 1));
    expect((await sameStore.list()).map((item) => item.id)).toEqual(["b", "a"]);
    expect((await sameStore.get("a"))?.messages[0]).toMatchObject({ role: "user" });
    expect(await store.list()).toEqual([]);
  });

  it("replaces a conversation saved again and removes one", async () => {
    const storage = memoryStorage();
    const store = new LocalChatHistoryStore(() => storage);
    await store.save(conversation("a", 5));
    await store.save({ ...conversation("a", 0), title: "Đổi tên" });
    expect(await store.list()).toHaveLength(1);
    expect((await store.get("a"))?.title).toBe("Đổi tên");
    await store.remove("a");
    expect(await store.list()).toEqual([]);
  });

  it("keeps at most 30 conversations and 60 messages each", async () => {
    const storage = memoryStorage();
    const store = new LocalChatHistoryStore(() => storage);
    for (let i = 0; i < HISTORY_LIMITS.conversations + 5; i += 1) {
      await store.save(conversation(`c${i}`, 1000 - i));
    }
    const list = await store.list();
    expect(list).toHaveLength(HISTORY_LIMITS.conversations);
    expect(list.at(-1)?.id).toBe("c5"); // the five oldest went first

    const many = Array.from({ length: 80 }, (_, i) =>
      text(`m${i}`, i % 2 ? "assistant" : "user", `#${i}`),
    );
    await store.save(conversation("long", 0, many));
    const messages = (await store.get("long"))?.messages ?? [];
    expect(messages).toHaveLength(HISTORY_LIMITS.messagesPerConversation);
    expect(messages.at(-1)?.id).toBe("m79");
  });

  it("never stores a full photo, only small thumbnails or sample paths", async () => {
    const storage = memoryStorage();
    const store = new LocalChatHistoryStore(() => storage);
    const photo = `data:image/jpeg;base64,${"A".repeat(HISTORY_LIMITS.thumbnailMaxChars)}`;
    await store.save(
      conversation("img", 0, [
        { id: "1", role: "user", parts: [{ type: "file", mediaType: "image/jpeg", url: photo }] },
        {
          id: "2",
          role: "user",
          parts: [
            { type: "file", mediaType: "image/jpeg", url: "data:image/jpeg;base64,AAAA" },
            { type: "text", text: "ảnh nhỏ" },
          ],
        },
        {
          id: "3",
          role: "user",
          parts: [
            { type: "file", mediaType: "image/jpeg", url: "/images/laviagent/samples/shell.jpg" },
          ],
        },
      ]),
    );
    const messages = (await store.get("img"))?.messages ?? [];
    expect(messages.map((message) => message.id)).toEqual(["2", "3"]);
    expect(storage.data.get(HISTORY_STORAGE_KEY)).not.toContain("A".repeat(1000));
  });

  it("survives a blocked, throwing or corrupted storage", async () => {
    const throwing = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    };
    const blocked = new LocalChatHistoryStore(() => throwing);
    await expect(blocked.save(conversation("a", 0))).resolves.toBeUndefined();
    expect(await blocked.list()).toEqual([]);

    expect(await new LocalChatHistoryStore(() => null).list()).toEqual([]);

    const corrupted = memoryStorage();
    corrupted.data.set(HISTORY_STORAGE_KEY, "{not json");
    expect(await new LocalChatHistoryStore(() => corrupted).list()).toEqual([]);
  });

  it("drops the oldest conversations when the storage is full", async () => {
    const storage = memoryStorage(1500);
    const store = new LocalChatHistoryStore(() => storage);
    for (let i = 0; i < 10; i += 1) await store.save(conversation(`c${i}`, 100 - i));
    const ids = (await store.list()).map((item) => item.id);
    expect(ids[0]).toBe("c9");
    expect(ids.length).toBeLessThan(10);
  });
});
