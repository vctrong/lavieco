import type { UIMessage } from "ai";
import type { z } from "zod";

import type {
  analyzeResponseSchema,
  chatContextSchema,
  classifyResultSchema,
  detectedMaterialSchema,
  difficultySchema,
  fallbackAnswerSchema,
  ideaSchema,
  kitSchema,
  materialIdSchema,
  materialSchema,
} from "./schemas";

export type MaterialId = z.infer<typeof materialIdSchema>;
export type DetectedMaterial = z.infer<typeof detectedMaterialSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type Material = z.infer<typeof materialSchema>;
export type Idea = z.infer<typeof ideaSchema>;
export type Kit = z.infer<typeof kitSchema>;
export type FallbackAnswer = z.infer<typeof fallbackAnswerSchema>;
export type ClassifyResult = z.infer<typeof classifyResultSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
export type ChatContext = z.infer<typeof chatContextSchema>;

/** Everything the client screens render, handed over by the server page (no JSON in the bundle twice). */
export type Catalog = {
  materials: Material[];
  ideas: Idea[];
  kits: Kit[];
  suggestions: FallbackAnswer[];
};

/** How a material entered the conversation. */
export type AnalysisSource = "ai" | "sample" | "manual";

/** Why the conversation asks the visitor to pick a material. */
export type PickReason = "offline" | "unknown" | "failed" | "timeout" | "network" | "rate_limited";

/**
 * Cards LaviAgent posts without the model (docs/07 §4): built on the client from the
 * analyze route, a sample or a chip, and kept in the conversation like any message.
 */
export type AgentDataTypes = {
  analysis: { material: MaterialId; source: AnalysisSource; result: ClassifyResult | null };
  hazard: { result: ClassifyResult };
  picker: { reason: PickReason };
};

/** Marks answers written in advance (chips while the AI is unavailable). */
export type AgentMessageMetadata = { fallback?: boolean };

export type AgentMessage = UIMessage<AgentMessageMetadata, AgentDataTypes>;
