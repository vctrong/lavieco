import "server-only";

import type { Metadata } from "next";

import { publicEnv } from "@/lib/env.public";

import { eventPath } from "../constants/config";
import { TEXT } from "../constants/text";
import { eventCalendar } from "../utils/calendar";
import { shareImageOf } from "../utils/seo";
import { getEvent } from "./events";

/** `generateMetadata` of an event page: title, description, canonical, share image. */
export async function eventMetadata(slug: string): Promise<Metadata> {
  const event = await getEvent(slug).catch(() => null);
  if (!event) return {};
  const image = shareImageOf(event, publicEnv.cloudinaryCloudName);
  const description = event.summary || undefined;
  return {
    title: event.title,
    description,
    alternates: { canonical: eventPath(event.slug) },
    openGraph: {
      type: "website",
      title: event.title,
      description,
      url: eventPath(event.slug),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: event.title,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}

/**
 * `GET /chuong-trinh/[slug]/lich`: the event as an `.ics` file ("Thêm vào lịch").
 * Public data only; 404 for drafts and unknown slugs, like the page.
 */
export async function eventCalendarResponse(slug: string): Promise<Response> {
  const event = await getEvent(slug).catch(() => null);
  if (!event) return new Response(null, { status: 404 });
  const body = eventCalendar(event, {
    pageUrl: new URL(eventPath(event.slug), publicEnv.siteUrl).toString(),
    organizer: TEXT.vi.meta.organizer,
  });
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${event.slug}.ics"`,
      "cache-control": "public, max-age=300",
    },
  });
}
