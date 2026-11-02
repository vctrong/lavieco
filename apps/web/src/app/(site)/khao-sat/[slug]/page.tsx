import type { Metadata } from "next";

import { SURVEYS_TEXT, SurveyPage } from "@/features/surveys";

export const metadata: Metadata = {
  title: SURVEYS_TEXT.vi.meta.title,
  robots: { index: false, follow: false },
  // `?t=` is a ticket's share token: it must not leave in a Referer header.
  referrer: "no-referrer",
};

export default async function SurveyRoute({ params, searchParams }: PageProps<"/khao-sat/[slug]">) {
  const { slug } = await params;
  const { t } = await searchParams;
  return <SurveyPage slug={slug} ticketToken={typeof t === "string" ? t : null} />;
}
