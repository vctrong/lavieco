import type { Metadata } from "next";

import { can } from "@lavieco/shared/permissions";

import { requireStaff } from "@/features/shell";
import { SURVEYS_TEXT, SurveyResultsPage, loadSurveyResults } from "@/features/surveys";

export const metadata: Metadata = { title: SURVEYS_TEXT.vi.meta.results };

export default async function SurveyResultsRoute({ params }: PageProps<"/surveys/[id]/results">) {
  const { id } = await params;
  const [staff, { survey, results }] = await Promise.all([requireStaff(), loadSurveyResults(id)]);
  return (
    <SurveyResultsPage survey={survey} results={results} canExport={can(staff, "survey:read")} />
  );
}
