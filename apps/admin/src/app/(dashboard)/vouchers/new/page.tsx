import type { Metadata } from "next";

import { NewVoucherPage, VOUCHERS_TEXT, loadEventChoices } from "@/features/vouchers";

export const metadata: Metadata = { title: VOUCHERS_TEXT.vi.meta.create };

export default async function NewVoucherRoute({ searchParams }: PageProps<"/vouchers/new">) {
  const eventId = (await searchParams)["su-kien"];
  const events = await loadEventChoices();
  const preset = typeof eventId === "string" && /^[0-9a-f]{24}$/.test(eventId) ? eventId : null;
  return <NewVoucherPage events={events} presetEventId={preset} />;
}
