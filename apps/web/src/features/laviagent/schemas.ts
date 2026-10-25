import { z } from "zod";

/**
 * LaviAgent contracts (docs/07). They live in the feature, not in @lavieco/shared: the
 * demo runs entirely inside `web` (ADR-0024). Move them to `shared` with the module the
 * day it becomes a service.
 */

export const MATERIAL_IDS = [
  "plastic_bottle",
  "aluminum_can",
  "paper_box",
  "glass_jar",
  "shell",
] as const;

export const materialIdSchema = z.enum(MATERIAL_IDS);
/** What the classifier may answer: a supported material or "unknown". */
export const detectedMaterialSchema = z.enum([...MATERIAL_IDS, "unknown"]);

export const DIFFICULTIES = ["easy", "medium", "advanced"] as const;
export const difficultySchema = z.enum(DIFFICULTIES);

/** Feather icon names allowed in materials.json (mapped to components in constants/icons.ts). */
export const MATERIAL_ICON_NAMES = ["droplet", "disc", "package", "coffee", "shell"] as const;

const imagePathSchema = z.string().regex(/^\/images\/laviagent\/[a-z0-9/-]+\.(jpg|png|webp)$/);
const idSchema = z.string().regex(/^[a-z0-9-]{3,60}$/);

export const ideaStepSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  image: imagePathSchema.optional(),
  safetyNote: z.string().min(1).optional(),
});

/** A preparation shared by every idea of a material (e.g. cleaning shells). */
export const preparationSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  durationLabel: z.string().min(1),
  steps: z.array(ideaStepSchema).min(1).max(12),
  safetyNote: z.string().min(1),
});

export const materialSchema = z.object({
  id: materialIdSchema,
  name: z.string().min(1),
  icon: z.enum(MATERIAL_ICON_NAMES),
  description: z.string().min(1),
  /** General safety advice shown on the result card. */
  safetyNote: z.string().min(1),
  /** Words that point to this material in a chat message (no diacritics needed). */
  keywords: z.array(z.string().min(2)).min(1),
  /** Done once before any idea of this material; shown on its idea pages and given to the chat. */
  preparation: preparationSchema.optional(),
  /** 0–100, drives the "tiềm năng tái chế" meter. Demo value. */
  recyclePotential: z.number().int().min(0).max(100),
  /** Fixed answer for "Thử với ảnh mẫu" (no API call). */
  sample: z.object({
    image: imagePathSchema,
    alt: z.string().min(1),
    shape: z.string().min(1),
    condition: z.string().min(1),
    confidence: z.number().min(0).max(1),
  }),
});

export const ideaSchema = z.object({
  id: idSchema,
  material: materialIdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  difficulty: difficultySchema,
  durationMinutes: z.number().int().positive(),
  /** Suggested minimum age of the maker (content metadata; nobody is asked their age, BR-08). */
  ageMin: z.number().int().min(3).max(18),
  coverImage: imagePathSchema,
  coverAlt: z.string().min(1),
  toolsHave: z.array(z.string().min(1)).min(1),
  toolsNeed: z.array(z.string().min(1)),
  steps: z.array(ideaStepSchema).min(1).max(12),
  kitId: idSchema.optional(),
});

export const kitSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  summary: z.string().min(1),
  /** Listed price in whole VND (BR-10: the final price is confirmed by the team). */
  price: z.number().int().positive(),
  contents: z.array(z.string().min(1)).min(1),
  image: imagePathSchema,
  imageAlt: z.string().min(1),
  /** Product page; a placeholder until the shop exists (TODO(laviagent-kit-page)). */
  productUrl: z.string().startsWith("/"),
});

export const fallbackAnswerSchema = z.object({
  id: idSchema,
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const materialsFileSchema = z.object({ materials: z.array(materialSchema).length(5) });
export const ideasFileSchema = z.object({ ideas: z.array(ideaSchema).min(1) });
export const kitsFileSchema = z.object({ kits: z.array(kitSchema).min(1) });
export const fallbackAnswersFileSchema = z.object({
  suggestions: z.array(fallbackAnswerSchema).min(1),
  offlineDefault: z.string().min(1),
});

export const HAZARD_KINDS = [
  "none",
  "battery",
  "light_bulb",
  "broken_glass",
  "medical_waste",
  "chemical",
  "other",
] as const;

/** Answer of `POST /api/laviagent/analyze`, whichever provider produced it. */
export const classifyResultSchema = z.object({
  material: detectedMaterialSchema,
  /** Short Vietnamese description, e.g. "Chai trụ tròn 500 ml". */
  shape: z.string().max(120),
  condition: z.string().max(120),
  confidence: z.number().min(0).max(1),
  safetyFlags: z.object({
    hazardous: z.boolean(),
    hazardKind: z.enum(HAZARD_KINDS),
    sharpEdges: z.boolean(),
  }),
});

export const analyzeResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), result: classifyResultSchema }),
  /** LAVIAGENT_DEMO_MODE=offline: the client goes straight to the manual picker. */
  z.object({ status: z.literal("offline") }),
  z.object({
    status: z.literal("error"),
    reason: z.enum(["invalid_image", "too_large", "rate_limited", "timeout", "unavailable"]),
  }),
]);

/** What the page tells the chat route about what the visitor is looking at. */
export const chatContextSchema = z.object({
  material: materialIdSchema.optional(),
  ideaId: idSchema.optional(),
});
