import type { Metadata } from "next";

import { CHECKOUT_TEXT, TicketPage } from "@/features/checkout";

export const metadata: Metadata = {
  title: CHECKOUT_TEXT.vi.meta.ticket,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function TicketRoute({ params, searchParams }: PageProps<"/ve/[token]">) {
  const { token } = await params;
  const query = await searchParams;
  return <TicketPage token={token} justBooked={query.moi === "1"} />;
}
