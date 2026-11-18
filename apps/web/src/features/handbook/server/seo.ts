import "server-only";

import type { Metadata, MetadataRoute } from "next";

import type { PublicHandbook, PublicHandbookPageDetail } from "@lavieco/shared/content";
import { mediaDeliveryUrl } from "@lavieco/shared/media";

import { publicEnv } from "@/lib/env.public";
import { siteUrl } from "@/lib/site-url";

import { COVER_HREF, pageHref } from "../constants/config";
import { TEXT } from "../constants/text";

const OG_WIDTH = 1280;
const DESCRIPTION_MAX = 160;

/** The page image as a share preview (Zalo, Facebook…), at a fixed delivery width. */
function ogImage(image: { publicId: string; width: number; height: number }, alt: string) {
  if (!publicEnv.cloudinaryCloudName) return undefined;
  const width = Math.min(OG_WIDTH, image.width);
  return {
    url: mediaDeliveryUrl({
      cloudName: publicEnv.cloudinaryCloudName,
      publicId: image.publicId,
      width,
    }),
    width,
    height: Math.round((image.height / image.width) * width),
    alt,
  };
}

/** First words of the page text, else the page description, for search snippets. */
function describe(detail: PublicHandbookPageDetail): string {
  const text = detail.text.replace(/\s+/g, " ").trim();
  if (!text) return `${detail.chapter.title} · ${detail.book.title}. ${TEXT.vi.meta.description}`;
  return text.length <= DESCRIPTION_MAX ? text : `${text.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
}

export function pageMetadata(detail: PublicHandbookPageDetail): Metadata {
  const title = TEXT.vi.reading.metaTitle(detail.page.title, detail.book.title);
  const description = describe(detail);
  const image = ogImage(detail.page.image, detail.page.alt || detail.page.title);
  return {
    title,
    description,
    alternates: { canonical: pageHref(detail.page.key) },
    openGraph: {
      type: "article",
      title,
      description,
      url: pageHref(detail.page.key),
      ...(image ? { images: [image] } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** The cover and every published page, for `sitemap.xml`. */
export function handbookSitemap(book: PublicHandbook): MetadataRoute.Sitemap {
  const lastModified = new Date(book.publishedAt);
  return [
    {
      url: siteUrl(COVER_HREF).toString(),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...book.pages.map((page) => ({
      url: siteUrl(pageHref(page.key)).toString(),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
