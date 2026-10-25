import "server-only";

import type { Idea, Kit, MaterialId } from "../../types";
import { HandbookKnowledgeSource } from "./handbook-knowledge-source";
import type { ContextPassage, KnowledgeSource } from "./knowledge-source";
import { StaticKnowledgeSource } from "./static-knowledge-source";

const MAX_PASSAGES = 6;

/**
 * Several sources behind one interface. Lookups take the first source that knows the
 * id; context passages are concatenated in source order (static first), then capped.
 */
export class CompositeKnowledgeSource implements KnowledgeSource {
  constructor(private readonly sources: readonly KnowledgeSource[]) {}

  async getIdeasByMaterial(material: MaterialId): Promise<Idea[]> {
    const lists = await Promise.all(this.sources.map((s) => s.getIdeasByMaterial(material)));
    return dedupe(lists.flat());
  }

  async getIdea(id: string): Promise<Idea | null> {
    for (const source of this.sources) {
      const idea = await source.getIdea(id);
      if (idea) return idea;
    }
    return null;
  }

  async getKits(): Promise<Kit[]> {
    const lists = await Promise.all(this.sources.map((s) => s.getKits()));
    return dedupe(lists.flat());
  }

  async getKit(id: string): Promise<Kit | null> {
    for (const source of this.sources) {
      const kit = await source.getKit(id);
      if (kit) return kit;
    }
    return null;
  }

  async searchContext(query: string, material: MaterialId | undefined): Promise<ContextPassage[]> {
    const lists = await Promise.all(this.sources.map((s) => s.searchContext(query, material)));
    return lists.flat().slice(0, MAX_PASSAGES);
  }
}

function dedupe<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id));
}

let instance: KnowledgeSource | null = null;

/** The knowledge LaviAgent uses. The handbook source answers nothing until RAG exists. */
export function knowledgeSource(): KnowledgeSource {
  instance ??= new CompositeKnowledgeSource([
    new StaticKnowledgeSource(),
    new HandbookKnowledgeSource(),
  ]);
  return instance;
}
