import type { AgentMessage, Material } from "../types";

const MAX_TITLE = 48;

/**
 * A conversation is named after what started it: the material of the first card, or
 * the first question. Null until there is one (the caller shows "Cuộc trò chuyện mới").
 */
export function conversationTitle(
  messages: readonly AgentMessage[],
  materials: readonly Pick<Material, "id" | "name">[],
): string | null {
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === "data-analysis") {
        return materials.find((item) => item.id === part.data.material)?.name ?? null;
      }
      if (message.role === "user" && part.type === "text" && part.text.trim()) {
        const text = part.text.trim().replace(/\s+/g, " ");
        return text.length > MAX_TITLE ? `${text.slice(0, MAX_TITLE - 1).trimEnd()}…` : text;
      }
    }
  }
  return null;
}
