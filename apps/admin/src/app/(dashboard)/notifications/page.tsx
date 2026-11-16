import type { Metadata } from "next";

import { NOTIFICATIONS_TEXT, NotificationsPage, loadPushSettings } from "@/features/notifications";

export const metadata: Metadata = { title: NOTIFICATIONS_TEXT.vi.title };

export default async function NotificationsRoute() {
  return <NotificationsPage settings={await loadPushSettings()} />;
}
