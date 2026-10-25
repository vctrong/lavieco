import "server-only";

import type { ContextPassage, KnowledgeSource } from "./knowledge-source";

/**
 * TODO(laviagent-rag): the Digital Green Handbook as a knowledge source (docs/07 §6).
 *
 * Intended shape, nothing of it exists yet:
 * 1. content-service publishes handbook chapters (published revisions only, S3).
 * 2. An indexing job splits each published page into ~300–500-token chunks, keeps
 *    `{ chapterId, pageId, revision, accessLevel }` with each chunk (BR-03), and embeds
 *    them (Gemini or LAVIECO's own embedding model).
 * 3. Chunks + vectors live in a `handbook_chunks` collection with an Atlas Vector Search
 *    index (we already run Atlas). Re-index on the `content:handbook` publish outbox.
 * 4. `searchContext` embeds the question, runs `$vectorSearch` (filtered by material
 *    tags and accessLevel) and returns the top passages with their chapter as `source`.
 * This class answers nothing until then, so `CompositeKnowledgeSource` can already list it.
 */
export class HandbookKnowledgeSource implements KnowledgeSource {
  async getIdeasByMaterial() {
    return [];
  }

  async getIdea() {
    return null;
  }

  async getKits() {
    return [];
  }

  async getKit() {
    return null;
  }

  async searchContext(): Promise<ContextPassage[]> {
    return [];
  }
}
