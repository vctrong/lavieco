import type { Metadata } from "next";

import { CheckinScanPage, TICKETING_TEXT, loadCheckinEvent } from "@/features/ticketing";

export const metadata: Metadata = { title: TICKETING_TEXT.vi.checkin.title };

export default async function CheckinScanRoute({ params }: PageProps<"/checkin/[eventId]">) {
  const { eventId } = await params;
  const { event, stats } = await loadCheckinEvent(eventId);
  return <CheckinScanPage event={event} stats={stats} />;
}
