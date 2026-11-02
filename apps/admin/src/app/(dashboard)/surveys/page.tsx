import type { Metadata } from "next";

import { SURVEY_KINDS, SURVEY_STATUSES } from "@lavieco/shared/events";
import { can } from "@lavieco/shared/permissions";

import { requireStaff } from "@/features/shell";
import { SURVEYS_TEXT, SurveysListPage, loadSurveys } from "@/features/surveys";

export const metadata: Metadata = { title: SURVEYS_TEXT.vi.meta.list };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const pick = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
  allowed.includes(value as T) ? (value as T) : undefined;

export default async function SurveysRoute({ searchParams }: PageProps<"/surveys">) {
  const params = await searchParams;
  const filters = {
    kind: pick(first(params.kind), SURVEY_KINDS),
    status: pick(first(params.status), SURVEY_STATUSES),
  };
  const [staff, page] = await Promise.all([
    requireStaff(),
    loadSurveys({ ...filters, cursor: first(params.cursor)?.slice(0, 512) }),
  ]);
  return <SurveysListPage page={page} filters={filters} canWrite={can(staff, "survey:write")} />;
}
