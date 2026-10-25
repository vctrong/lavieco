import "server-only";

import type { ChatKnowledge } from "../knowledge/knowledge-source";
import { ideaPassage } from "../knowledge/static-knowledge-source";
import { CHAT_SYSTEM_PROMPT } from "./system-prompt";

const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")} đ`;

/**
 * System prompt + the context block. History is not part of the instructions: the
 * provider passes it as messages (last 10 only, see chat-handler.ts).
 */
export function buildChatInstructions(knowledge: ChatKnowledge): string {
  const lines: string[] = [
    "",
    "# NGỮ CẢNH (dữ liệu của LAVIECO, chỉ dùng thông tin này cho ý tưởng và KIT)",
  ];

  lines.push(
    knowledge.material
      ? `Vật liệu người dùng đang xem: ${knowledge.material}.`
      : "Người dùng chưa chọn vật liệu.",
  );
  if (knowledge.focusIdea) {
    lines.push(`Ý tưởng đang mở: ${knowledge.focusIdea.id}.`);
  }

  if (knowledge.ideas.length > 0) {
    lines.push("", "## Ý tưởng liên quan");
    for (const idea of knowledge.ideas) {
      const passage = ideaPassage(idea);
      lines.push(`- id ${idea.id}${idea.kitId ? ` (KIT: ${idea.kitId})` : ""}: ${passage.text}`);
    }
  }

  const extra = knowledge.passages.filter(
    (passage) => !knowledge.ideas.some((idea) => passage.source === `Ý tưởng: ${idea.id}`),
  );
  if (extra.length > 0) {
    lines.push("", "## Tư liệu tham khảo");
    for (const passage of extra) lines.push(`- [${passage.source}] ${passage.text}`);
  }

  lines.push("", "## KIT của LAVIECO (danh sách duy nhất được phép giới thiệu)");
  for (const kit of knowledge.kits) {
    lines.push(
      `- id ${kit.id}: ${kit.name}, giá tham khảo ${formatVnd(kit.price)}. ${kit.summary} Gồm: ${kit.contents.join(", ")}.`,
    );
  }

  return CHAT_SYSTEM_PROMPT + lines.join("\n");
}
