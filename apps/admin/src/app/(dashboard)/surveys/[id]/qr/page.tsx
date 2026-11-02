import type { Metadata } from "next";

import { SURVEYS_TEXT, SurveyQrPage, loadSurvey, surveyLink } from "@/features/surveys";

export const metadata: Metadata = { title: SURVEYS_TEXT.vi.meta.edit };

export default async function SurveyQrRoute({ params }: PageProps<"/surveys/[id]/qr">) {
  const { id } = await params;
  const survey = await loadSurvey(id);
  return <SurveyQrPage survey={survey} link={await surveyLink(survey.slug, 960)} />;
}
