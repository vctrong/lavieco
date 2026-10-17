import type { Metadata } from "next";

import { EventDetailPage, getEvent } from "@/features/events";

export async function generateMetadata({
  params,
}: PageProps<"/chuong-trinh/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug).catch(() => null);
  if (!event) return {};
  return {
    title: event.title,
    description: event.summary || undefined,
    alternates: { canonical: `/chuong-trinh/${event.slug}` },
  };
}

export default async function EventRoute({ params }: PageProps<"/chuong-trinh/[slug]">) {
  const { slug } = await params;
  return <EventDetailPage slug={slug} />;
}
