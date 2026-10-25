import "server-only";

import type { Idea, MaterialId } from "../../types";
import { TEXT } from "../../constants/text";
import { normalizeSearchText } from "../../utils/normalize-search-text";
import { staticData } from "./catalog";
import type { ContextPassage, KnowledgeSource } from "./knowledge-source";

const MAX_PASSAGES = 4;

/** Ideas, kits and safety notes from the JSON files in `data/` (demo content). */
export class StaticKnowledgeSource implements KnowledgeSource {
  async getIdeasByMaterial(material: MaterialId) {
    return staticData().ideas.filter((idea) => idea.material === material);
  }

  async getIdea(id: string) {
    return staticData().ideas.find((idea) => idea.id === id) ?? null;
  }

  async getKits() {
    return staticData().kits;
  }

  async getKit(id: string) {
    return staticData().kits.find((kit) => kit.id === id) ?? null;
  }

  /**
   * Keyword overlap, good enough for a dozen ideas. The handbook source replaces this
   * with vector search; the signature stays.
   */
  async searchContext(query: string, material: MaterialId | undefined) {
    const { materials, ideas } = staticData();
    const words = new Set(
      normalizeSearchText(query)
        .split(" ")
        .filter((word) => word.length > 2),
    );
    const score = (idea: Idea) => {
      const haystack = normalizeSearchText(
        [idea.title, idea.summary, ...idea.toolsHave, ...idea.toolsNeed].join(" "),
      );
      let hits = idea.material === material ? 2 : 0;
      for (const word of words) if (haystack.includes(word)) hits += 1;
      return hits;
    };

    const passages: ContextPassage[] = [];
    const current = materials.find((item) => item.id === material);
    if (current) {
      passages.push({
        source: `Vật liệu: ${current.id}`,
        text: `${current.name}. ${current.description} An toàn: ${current.safetyNote}`,
      });
    }
    const ranked = ideas
      .map((idea) => ({ idea, hits: score(idea) }))
      .filter(({ hits }) => hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, MAX_PASSAGES - passages.length);
    for (const { idea } of ranked) passages.push(ideaPassage(idea));
    return passages;
  }
}

export function ideaPassage(idea: Idea): ContextPassage {
  const steps = idea.steps
    .map(
      (step, index) =>
        `${index + 1}. ${step.title}${step.safetyNote ? ` (${step.safetyNote})` : ""}`,
    )
    .join(" ");
  return {
    source: `Ý tưởng: ${idea.id}`,
    text: `${idea.title} (${TEXT.vi.difficulty[idea.difficulty]}, ${idea.durationMinutes} phút, từ ${idea.ageMin} tuổi). ${idea.summary} Cần chuẩn bị: ${idea.toolsNeed.join(", ") || "không"}. Các bước: ${steps}`,
  };
}
