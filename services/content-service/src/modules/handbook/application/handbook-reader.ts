import { DomainError } from "@lavieco/shared";
import {
  HANDBOOK_DEFAULT_SLUG,
  type HandbookPublishedText,
  type HandbookSearchResult,
} from "@lavieco/shared/content";

import type { HandbookRecord, VersionRecord } from "../domain/handbook";
import { searchablePages, toPublicHandbook, toPublicPageDetail } from "../domain/public-view";
import { searchPages } from "../domain/search";
import { hashPreviewToken } from "./handbook-editor";
import type { HandbookRepository } from "./ports/handbook-repository.port";
import type { HandbookPreviewTokenRepository } from "./ports/preview-token-repository.port";

/**
 * Public reading of the handbook (UC-02), called by `web` only. Published content
 * only (S3); a published version never changes, so it is kept in memory by id.
 */
export class HandbookReader {
  private cached: VersionRecord | null = null;

  constructor(
    private readonly handbooks: HandbookRepository,
    private readonly previewTokens: HandbookPreviewTokenRepository,
  ) {}

  async book() {
    const { handbook, version } = await this.published();
    return toPublicHandbook(handbook.slug, handbook.accessLevel, version);
  }

  async page(key: string) {
    const { version } = await this.published();
    return toPublicPageDetail(version, key);
  }

  async search(query: string): Promise<HandbookSearchResult> {
    const { version } = await this.published();
    return { query, results: searchPages(searchablePages(version), query) };
  }

  /** Every page's text, paged by position: what LaviAgent will index (RAG, docs/07 §6). */
  async publishedText(cursor: number, limit: number): Promise<HandbookPublishedText> {
    const { handbook, version } = await this.published();
    const chapters = new Map(version.chapters.map((chapter) => [chapter.id, chapter.title]));
    const items = version.pages.slice(cursor, cursor + limit).map((page, i) => ({
      key: page.key,
      number: cursor + i + 1,
      chapterTitle: chapters.get(page.chapterId) ?? "",
      title: page.title,
      text: page.text,
    }));
    const next = cursor + limit;
    return {
      versionNumber: version.number,
      accessLevel: handbook.accessLevel,
      items,
      nextCursor: next < version.pages.length ? next : null,
    };
  }

  /** The draft behind a valid preview token, in the public shape (never indexed by web). */
  async preview(token: string, now = new Date()) {
    const versionId = await this.previewTokens.findVersionId(hashPreviewToken(token), now);
    const version = versionId ? await this.handbooks.findVersion(versionId) : null;
    if (!version) throw new DomainError("handbook.preview_invalid");
    const handbook = await this.handbooks.findBySlug(HANDBOOK_DEFAULT_SLUG);
    if (!handbook) throw new DomainError("handbook.preview_invalid");
    return toPublicHandbook(handbook.slug, handbook.accessLevel, version);
  }

  private async published(): Promise<{ handbook: HandbookRecord; version: VersionRecord }> {
    const handbook = await this.handbooks.findBySlug(HANDBOOK_DEFAULT_SLUG);
    if (!handbook?.publishedVersionId) throw new DomainError("handbook.not_published");
    if (this.cached?.id !== handbook.publishedVersionId) {
      const version = await this.handbooks.findVersion(handbook.publishedVersionId);
      if (!version) throw new DomainError("handbook.not_published");
      this.cached = version;
    }
    return { handbook, version: this.cached };
  }
}
