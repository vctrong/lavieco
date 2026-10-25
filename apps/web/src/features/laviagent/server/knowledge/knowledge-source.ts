import "server-only";

import type { Idea, Kit, MaterialId } from "../../types";

/**
 * Where LaviAgent's knowledge comes from (docs/07 §3). Static JSON today; the Digital
 * Green Handbook (RAG) joins through `CompositeKnowledgeSource` without touching callers.
 */
export type KnowledgeSource = {
  getIdeasByMaterial(material: MaterialId): Promise<Idea[]>;
  getIdea(id: string): Promise<Idea | null>;
  getKits(): Promise<Kit[]>;
  getKit(id: string): Promise<Kit | null>;
  /** Passages relevant to a chat question, already worded for the prompt. */
  searchContext(query: string, material: MaterialId | undefined): Promise<ContextPassage[]>;
};

export type ContextPassage = {
  /** Shown to the model as the citation label, e.g. "Ý tưởng: chau-cay-tu-duong". */
  source: string;
  text: string;
};

/** What the chat prompt is built from. */
export type ChatKnowledge = {
  material: MaterialId | undefined;
  focusIdea: Idea | null;
  ideas: Idea[];
  kits: Kit[];
  passages: ContextPassage[];
};
