import type { Metadata } from "next";

import { CheckinPickPage, TICKETING_TEXT, loadCheckinEvents } from "@/features/ticketing";

export const metadata: Metadata = { title: TICKETING_TEXT.vi.checkin.title };

export default async function CheckinRoute() {
  return <CheckinPickPage events={await loadCheckinEvents()} />;
}
