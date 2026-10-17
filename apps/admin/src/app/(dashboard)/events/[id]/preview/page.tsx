import type { Metadata } from "next";

import { EventPreviewPage, loadPreview } from "@/features/events";

export const metadata: Metadata = { title: "Xem trước chương trình" };

export default async function EventPreviewRoute({ params }: PageProps<"/events/[id]/preview">) {
  const { id } = await params;
  const { event, frameUrl } = await loadPreview(id);
  return <EventPreviewPage event={event} frameUrl={frameUrl} />;
}
