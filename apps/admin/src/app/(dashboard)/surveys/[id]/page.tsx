import type { Metadata } from "next";

import { can } from "@lavieco/shared/permissions";

import { requireStaff } from "@/features/shell";
import {
  EditSurveyPage,
  SURVEYS_TEXT,
  loadEventChoices,
  loadSurvey,
  surveyLink,
} from "@/features/surveys";

export const metadata: Metadata = { title: SURVEYS_TEXT.vi.meta.edit };

export default async function EditSurveyRoute({ params }: PageProps<"/surveys/[id]">) {
  const { id } = await params;
  const [staff, survey, events] = await Promise.all([
    requireStaff(),
    loadSurvey(id),
    loadEventChoices(),
  ]);
  return (
    <EditSurveyPage
      survey={survey}
      events={events}
      link={await surveyLink(survey.slug)}
      canWrite={can(staff, "survey:write")}
    />
  );
}
