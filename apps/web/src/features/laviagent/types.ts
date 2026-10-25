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
