import { notFound } from "next/navigation";
import { FiInfo } from "react-icons/fi";

import { isServiceProblem } from "@lavieco/api-clients";
import type { PublicSurvey } from "@lavieco/shared/events";
import { Container } from "@lavieco/ui";

import { requestId } from "@/lib/request-meta";
import { programClient } from "@/lib/services";

import { TEXT } from "../constants/text";
import { SurveyForm } from "./survey-form";

const t = TEXT.vi;
const DATE_TIME = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  dateStyle: "short",
  timeStyle: "short",
});

async function load(slug: string, ticketToken: string | null): Promise<PublicSurvey | null> {
  try {
    return await programClient().getPublicSurvey(
      slug,
      ticketToken ? { t: ticketToken } : {},
      await requestId(),
    );
  } catch (error) {
    if (isServiceProblem(error) && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

/** `/khao-sat/[slug]`, with `?t=` for a ticket's own link. Every state explains itself. */
export async function SurveyPage({
  slug,
  ticketToken,
}: {
  slug: string;
  ticketToken: string | null;
}) {
  const survey = await load(slug, ticketToken);
  if (!survey) notFound();
  const closedState = survey.state === "open" ? null : t.states[survey.state];
  return (
    <section className="bg-soft-white pb-24 pt-dock-clearance">
      <Container className="max-w-2xl pt-8 md:pt-14">
        <p className="text-label-caps uppercase text-emerald-ink">{t.eyebrow}</p>
        <h1 className="mt-2 font-display text-headline-lg-mobile text-deep-blue md:text-headline-lg">
          {survey.title}
        </h1>
        {closedState ? (
          <div role="status" className="mt-6 rounded-pedestal bg-mint-mist p-6">
            <h2 className="flex items-center gap-2 font-display text-headline-sm text-deep-blue">
              <FiInfo aria-hidden="true" size={18} />
              {closedState.title}
            </h2>
            <p className="mt-2 text-body-md text-charcoal/80">{closedState.body}</p>
            {survey.state === "not_open" && survey.opensAt ? (
              <p className="mt-2 text-body-md font-semibold text-deep-blue">
                {t.states.opensAt(DATE_TIME.format(new Date(survey.opensAt)))}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {survey.intro ? (
              <p className="mb-6 mt-4 whitespace-pre-line text-body-md text-charcoal/80">
                {survey.intro}
              </p>
            ) : (
              <div className="mb-6" />
            )}
            <SurveyForm survey={survey} ticketToken={ticketToken} />
          </>
        )}
      </Container>
    </section>
  );
}
