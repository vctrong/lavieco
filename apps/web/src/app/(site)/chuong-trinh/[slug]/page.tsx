import type { Metadata } from "next";

import { EventDetailPage, eventMetadata } from "@/features/events";

export async function generateMetadata({
  params,
}: PageProps<"/chuong-trinh/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return eventMetadata(slug);
}

export default async function EventRoute({ params }: PageProps<"/chuong-trinh/[slug]">) {
  const { slug } = await params;
  return <EventDetailPage slug={slug} />;
}
