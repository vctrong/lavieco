import type { Metadata } from "next";

import { NewSurveyPage, SURVEYS_TEXT, loadEventChoices } from "@/features/surveys";

export const metadata: Metadata = { title: SURVEYS_TEXT.vi.meta.create };

export default async function NewSurveyRoute({ searchParams }: PageProps<"/surveys/new">) {
  const params = await searchParams;
  const eventId = params["su-kien"];
  const events = await loadEventChoices();
  return (
    <NewSurveyPage
      events={events}
      preset={{
        eventId: typeof eventId === "string" && /^[0-9a-f]{24}$/.test(eventId) ? eventId : null,
        template: params.mau === "1",
      }}
    />
  );
}
