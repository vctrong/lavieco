import type { Metadata } from "next";

import { TEXT } from "./constants/text";
import type { Idea } from "./types";

export { LAVIAGENT_HREF } from "./constants/config";
export { IdeaDetail } from "./components/idea-detail";
export { LaviAgentApp } from "./components/laviagent-app";
export { LaviAgentFab } from "./components/laviagent-fab";
export { LaviAgentIntroSection } from "./components/intro-section";
export { handleAnalyze } from "./server/analyze-handler";
export { handleChat } from "./server/chat-handler";
export { getCatalog as getLaviagentCatalog } from "./server/knowledge/catalog";
export type { Catalog as LaviagentCatalog } from "./types";

export const laviagentMetadata: Metadata = {
  title: TEXT.vi.meta.title,
  description: TEXT.vi.meta.description,
};

export const ideaMetadata = (idea: Idea): Metadata => ({
  title: TEXT.vi.meta.ideaTitle(idea.title),
  description: idea.summary,
});
