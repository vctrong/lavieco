import type { Metadata } from "next";

import { UNSUBSCRIBE_TEXT, UnsubscribePage } from "@/features/unsubscribe";

export const metadata: Metadata = {
  title: UNSUBSCRIBE_TEXT.vi.meta.title,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function UnsubscribeRoute({ params }: PageProps<"/huy-nhan/[token]">) {
  const { token } = await params;
  return <UnsubscribePage token={token} />;
}
