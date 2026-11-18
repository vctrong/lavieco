import { DomainError } from "@lavieco/shared";
import {
  parseHandbookVideoUrl,
  type HandbookAccessLevel,
  type PublicHandbook,
  type PublicHandbookHotspot,
  type PublicHandbookPage,
  type PublicHandbookPageDetail,
} from "@lavieco/shared/content";

import { textIsMissing, type PageRecord, type VersionRecord } from "./handbook";
import type { SearchablePage } from "./search";

/**
 * Public shape of a published (or previewed) version (S3): only what a reader needs.
 * No note, editors, media ids or revision; product targets keep slug and title only.
 */

function publicHotspots(
  page: PageRecord,
  positions: ReadonlyMap<string, { key: string; number: number }>,
): PublicHandbookHotspot[] {
  const spots: PublicHandbookHotspot[] = [];
  for (const spot of page.hotspots) {
    const base = { id: spot.id, x: spot.x, y: spot.y, w: spot.w, h: spot.h, label: spot.label };
    const target = spot.target;
    switch (target.type) {
      case "product":
        spots.push({
          ...base,
          target: { type: "product", slug: target.slug, title: target.title },
        });
        break;
      case "page": {
        const linked = positions.get(target.pageId);
        if (linked) {
          spots.push({
            ...base,
            target: { type: "page", pageKey: linked.key, number: linked.number },
          });
        }
        break;
      }
      case "video": {
        const video = parseHandbookVideoUrl(target.url);
        if (video) {
          spots.push({
            ...base,
            target: { type: "video", provider: video.provider, videoId: video.id },
          });
        }
        break;
      }
      case "url":
        spots.push({ ...base, target: { type: "url", url: target.url } });
        break;
      case "laviagent":
        spots.push({ ...base, target: { type: "laviagent", prompt: target.prompt } });
        break;
    }
  }
  return spots;
}

function positionsOf(version: Pick<VersionRecord, "pages">) {
  return new Map(version.pages.map((page, i) => [page.id, { key: page.key, number: i + 1 }]));
}

function publicPage(
  page: PageRecord,
  number: number,
  positions: ReadonlyMap<string, { key: string; number: number }>,
): PublicHandbookPage {
  return {
    key: page.key,
    number,
    chapterId: page.chapterId,
    title: page.title,
    alt: page.alt || page.title,
    image: { publicId: page.image.publicId, width: page.image.width, height: page.image.height },
    hasText: !textIsMissing(page.text),
    hotspots: publicHotspots(page, positions),
  };
}

export function toPublicHandbook(
  slug: string,
  accessLevel: HandbookAccessLevel,
  version: VersionRecord,
): PublicHandbook {
  const positions = positionsOf(version);
  const pages = version.pages.map((page, i) => publicPage(page, i + 1, positions));
  const chapters = version.chapters.flatMap((chapter) => {
    const own = pages.filter((page) => page.chapterId === chapter.id);
    const first = own[0];
    return first
      ? [
          {
            id: chapter.id,
            slug: chapter.slug,
            title: chapter.title,
            tint: chapter.tint,
            firstPage: first.number,
            pageCount: own.length,
          },
        ]
      : [];
  });
  return {
    slug,
    title: version.title,
    description: version.description,
    accessLevel,
    versionNumber: version.number,
    publishedAt: (version.publishedAt ?? version.updatedAt).toISOString(),
    chapters,
    pages,
  };
}

export function toPublicPageDetail(version: VersionRecord, key: string): PublicHandbookPageDetail {
  const index = version.pages.findIndex((page) => page.key === key);
  const page = version.pages[index];
  if (!page) throw new DomainError("common.not_found");
  const chapter = version.chapters.find((item) => item.id === page.chapterId);
  if (!chapter) throw new DomainError("common.not_found");
  const link = (at: number) => {
    const other = version.pages[at];
    return other ? { key: other.key, number: at + 1, title: other.title } : null;
  };
  return {
    page: publicPage(page, index + 1, positionsOf(version)),
    text: page.text,
    chapter: { id: chapter.id, slug: chapter.slug, title: chapter.title },
    book: { title: version.title, pageCount: version.pages.length, versionNumber: version.number },
    previous: link(index - 1),
    next: link(index + 1),
  };
}

export function searchablePages(version: Pick<VersionRecord, "pages">): SearchablePage[] {
  return version.pages.map((page, i) => ({
    key: page.key,
    number: i + 1,
    chapterId: page.chapterId,
    title: page.title,
    text: page.text,
  }));
}
