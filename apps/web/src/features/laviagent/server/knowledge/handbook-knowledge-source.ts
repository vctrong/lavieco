import "server-only";

import { isServiceProblem } from "@lavieco/api-clients";

import { contentClient, webLogger } from "@/lib/services";

import type { ContextPassage, KnowledgeSource } from "./knowledge-source";

/** Characters of a page given to the model (a designed page holds far less). */
const PAGE_TEXT_MAX = 2_500;

/**
 * "Hỏi LaviAgent về trang này" (ADR-0029): the published text of the page the visitor
 * was reading, loaded here from content-service by its key. The browser only sends the
 * key, so the prompt never carries text a visitor typed in the address bar. Null when
 * the page is unknown, unpublished or content-service is down: the chat still answers.
 */
export async function handbookPagePassage(key: string): Promise<ContextPassage | null> {
  try {
    const detail = await contentClient().getPublishedHandbookPage(key);
    const text = detail.text.trim();
    return {
      source: `Trang Cẩm nang người dùng đang đọc (trang ${detail.page.number}: ${detail.page.title}, chương ${detail.chapter.title})`,
      text: text
        ? text.slice(0, PAGE_TEXT_MAX)
        : `(Trang này chưa có chữ. Mô tả ảnh: ${detail.page.alt})`,
    };
  } catch (error) {
    if (!(isServiceProblem(error) && error.status === 404)) {
      webLogger().warn("laviagent handbook page unavailable", {
        errorCode: isServiceProblem(error) ? error.code : "unavailable",
      });
    }
    return null;
  }
}

/**
 * TODO(laviagent-rag): the Digital Green Handbook as a knowledge source (docs/07 §6).
 * The text of every published page is already exported, paged, by content-service
 * (`GET /internal/v1/published-handbook/text`, `contentClient().getHandbookText`);
 * the page being read is already given to the chat by `handbookPagePassage`.
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
