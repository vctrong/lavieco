import type { Metadata } from "next";

import { EVENTS_TEXT, EventPreviewPage } from "@/features/events";

export const metadata: Metadata = {
  title: EVENTS_TEXT.vi.meta.previewTitle,
  robots: { index: false, follow: false },
};

/** Never cached (no-store): the token decides, and it expires after 10 minutes (D2). */
export const dynamic = "force-dynamic";

export default async function EventPreviewRoute({
  params,
  searchParams,
}: PageProps<"/xem-truoc/chuong-trinh/[token]">) {
  const { token } = await params;
  const eventId = (await searchParams)["su-kien"];
  return (
    <EventPreviewPage token={token} eventId={typeof eventId === "string" ? eventId : undefined} />
  );
}
