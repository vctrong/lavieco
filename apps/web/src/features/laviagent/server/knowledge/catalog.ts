import "server-only";

import fallbackFile from "../../data/fallback-answers.json";
import ideasFile from "../../data/ideas.json";
import kitsFile from "../../data/kits.json";
import materialsFile from "../../data/materials.json";
import {
  fallbackAnswersFileSchema,
  ideasFileSchema,
  kitsFileSchema,
  materialsFileSchema,
} from "../../schemas";
import type { Catalog } from "../../types";

/**
 * The demo content, validated once. A broken JSON edit fails the build (pages read it
 * while prerendering) instead of reaching a visitor.
 */
function load() {
  const { materials } = materialsFileSchema.parse(materialsFile);
  const { ideas } = ideasFileSchema.parse(ideasFile);
  const { kits } = kitsFileSchema.parse(kitsFile);
  const fallback = fallbackAnswersFileSchema.parse(fallbackFile);

  const kitIds = new Set(kits.map((kit) => kit.id));
  const ideaIds = new Set<string>();
  for (const idea of ideas) {
    if (ideaIds.has(idea.id)) throw new Error(`Duplicate LaviAgent idea id: ${idea.id}`);
    ideaIds.add(idea.id);
    if (idea.kitId && !kitIds.has(idea.kitId)) {
      throw new Error(`LaviAgent idea ${idea.id} points to a missing kit: ${idea.kitId}`);
    }
  }
  return { materials, ideas, kits, fallback };
}

let cached: ReturnType<typeof load> | null = null;

export function staticData() {
  cached ??= load();
  return cached;
}

/** What the client screens need, in one object. */
export function getCatalog(): Catalog {
  const { materials, ideas, kits, fallback } = staticData();
  return { materials, ideas, kits, suggestions: fallback.suggestions };
}
