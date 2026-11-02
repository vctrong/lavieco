import type { Metadata } from "next";

import { CHECKOUT_TEXT, SharedTicketPage } from "@/features/checkout";

export const metadata: Metadata = {
  title: CHECKOUT_TEXT.vi.ticket.shared.title,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SharedTicketRoute({ params }: PageProps<"/ve/v/[token]">) {
  const { token } = await params;
  return <SharedTicketPage token={token} />;
}
