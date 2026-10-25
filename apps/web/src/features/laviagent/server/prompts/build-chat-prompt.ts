import "server-only";

import { staticData } from "../knowledge/catalog";
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

  const material = staticData().materials.find((item) => item.id === knowledge.material);
  lines.push(
    material
      ? // The visitor already showed or chose it: never ask again whether they have one.
        `Chất liệu của người dùng ĐÃ BIẾT: ${material.name} (${material.id}), được nhận diện từ ảnh hoặc do người dùng chọn. Coi như họ đang có món đồ này; trả lời thẳng cho chất liệu này, KHÔNG hỏi lại họ có món đồ gì hay là chất liệu gì.`
      : 'Chưa biết chất liệu. Nếu tin nhắn của người dùng nhắc tới món đồ (ví dụ "lon bia" là lon nhôm, "hộp sữa" là hộp giấy), tự suy ra chất liệu và gợi ý ngay; chỉ hỏi lại khi thật sự không đoán được.',
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
