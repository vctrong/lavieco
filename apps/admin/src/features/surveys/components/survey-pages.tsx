import Image from "next/image";
import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiBarChart2, FiFileText, FiPlus } from "react-icons/fi";

import {
  SURVEY_KINDS,
  SURVEY_STATUSES,
  type SurveyList,
  type SurveyQuestionSummary,
  type SurveyResults,
  type SurveyView,
} from "@lavieco/shared/events";
import { Button, SelectField } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { CopySurveyLink, PrintPage, SurveyActions, SurveyExport } from "./survey-controls";
import { SurveyForm } from "./survey-form";

const t = TEXT.vi;
const DATE_TIME = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  dateStyle: "short",
  timeStyle: "short",
});

function BackToList() {
  return (
    <Link
      href="/surveys"
      className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-deep-blue/70 hover:text-deep-blue print:hidden"
    >
      <FiArrowLeft aria-hidden="true" size={13} />
      {t.back}
    </Link>
  );
}

type Filters = { kind?: string; status?: string };

export function SurveysListPage({
  page,
  filters,
  canWrite,
}: {
  page: SurveyList;
  filters: Filters;
  canWrite: boolean;
}) {
  const any = { value: "", label: t.filters.any };
  const nextParams = new URLSearchParams(
    Object.entries({ ...filters, cursor: page.nextCursor ?? "" }).filter(([, value]) => value) as [
      string,
      string,
    ][],
  );
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-museum text-deep-blue/60">
            {t.eyebrow}
          </p>
          <h1 className="font-display text-3xl text-deep-blue md:text-4xl">{t.title}</h1>
          <p className="mt-2 text-[14.5px] text-charcoal/75">{t.intro}</p>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <Button as={Link} href="/surveys/new?mau=1" variant="secondary" size="sm">
              <FiFileText aria-hidden="true" size={14} />
              {t.createTemplate}
            </Button>
            <Button as={Link} href="/surveys/new" size="sm">
              <FiPlus aria-hidden="true" size={15} />
              {t.createBlank}
            </Button>
          </div>
        ) : null}
      </header>
      <form
        method="get"
        action="/surveys"
        aria-label={t.filters.label}
        className="mb-6 grid gap-4 rounded-3xl border border-hairline bg-white p-5 md:grid-cols-[repeat(2,minmax(0,1fr))_auto]"
      >
        <SelectField
          tone="light"
          label={t.filters.kind}
          name="kind"
          defaultValue={filters.kind ?? ""}
          options={[any, ...SURVEY_KINDS.map((value) => ({ value, label: t.kind[value] }))]}
        />
        <SelectField
          tone="light"
          label={t.filters.status}
          name="status"
          defaultValue={filters.status ?? ""}
          options={[any, ...SURVEY_STATUSES.map((value) => ({ value, label: t.status[value] }))]}
        />
        <div className="flex items-end">
          <Button type="submit" variant="deep" size="sm" className="h-10.5 px-5">
            {t.filters.apply}
          </Button>
        </div>
      </form>
      <section className="overflow-hidden rounded-3xl border border-hairline bg-white shadow-ambient">
        {page.items.length === 0 ? (
          <p className="px-5 py-16 text-center text-[14px] text-charcoal/60">{t.empty}</p>
        ) : (
          <ul>
            {page.items.map((survey) => (
              <li
                key={survey.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline px-5 py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/surveys/${survey.id}`}
                    className="font-display text-lg text-deep-blue hover:text-emerald-ink"
                  >
                    {survey.title}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-charcoal/60">
                    {t.kind[survey.kind]} · {t.status[survey.status]} ·{" "}
                    {t.responses(survey.responseCount)}
                  </p>
                </div>
                <Link
                  href={`/surveys/${survey.id}/results`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist"
                >
                  <FiBarChart2 aria-hidden="true" size={13} />
                  {t.actions.results}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {page.nextCursor ? (
        <div className="mt-5 flex justify-end">
          <Link
            href={`/surveys?${nextParams.toString()}`}
            className="flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-[12.5px] text-deep-blue hover:bg-mint-mist"
          >
            {t.next}
            <FiArrowRight aria-hidden="true" size={13} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function NewSurveyPage({
  events,
  preset,
}: {
  events: { id: string; title: string }[];
  preset: { eventId: string | null; template: boolean };
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <BackToList />
      <h1 className="mb-8 font-display text-3xl text-deep-blue md:text-4xl">{t.meta.create}</h1>
      <SurveyForm survey={null} preset={preset} events={events} canWrite />
    </div>
  );
}

function ShareCard({ survey, link }: { survey: SurveyView; link: { url: string; qr: string } }) {
  const s = t.share;
  if (survey.settings.access === "ticket_holders") {
    return (
      <section className="mb-6 rounded-3xl border border-hairline bg-white p-5">
        <h2 className="font-display text-xl text-deep-blue">{s.title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-charcoal/75">{s.ticketOnly}</p>
      </section>
    );
  }
  return (
    <section className="mb-6 flex flex-wrap items-center gap-5 rounded-3xl border border-hairline bg-white p-5">
      <Image
        src={link.qr}
        alt={s.alt(survey.title)}
        width={120}
        height={120}
        unoptimized
        className="rounded-xl"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <h2 className="font-display text-xl text-deep-blue">{s.title}</h2>
        <p className="break-all text-[13px] text-charcoal/75">{link.url}</p>
        <div className="flex flex-wrap gap-2">
          <CopySurveyLink url={link.url} />
          <a
            href={link.qr}
            download={`khao-sat-${survey.slug}.png`}
            className="inline-flex items-center rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist"
          >
            {s.png}
          </a>
          <Link
            href={`/surveys/${survey.id}/qr`}
            className="inline-flex items-center rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist"
          >
            {s.a4}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function EditSurveyPage({
  survey,
  events,
  link,
  canWrite,
}: {
  survey: SurveyView;
  events: { id: string; title: string }[];
  link: { url: string; qr: string };
  canWrite: boolean;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <BackToList />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-deep-blue">{survey.title}</h1>
          <p className="mt-1 text-[13px] text-charcoal/65">
            {t.kind[survey.kind]} · {t.status[survey.status]} · {t.responses(survey.responseCount)}
          </p>
        </div>
        <Link
          href={`/surveys/${survey.id}/results`}
          className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-deep-blue hover:bg-mint-mist"
        >
          <FiBarChart2 aria-hidden="true" size={13} />
          {t.actions.results}
        </Link>
      </div>
      {canWrite ? (
        <div className="mb-6">
          <SurveyActions survey={survey} />
        </div>
      ) : null}
      <ShareCard survey={survey} link={link} />
      <SurveyForm survey={survey} events={events} canWrite={canWrite} />
    </div>
  );
}

/** A4 sheet to print, or show on the last slide. */
export function SurveyQrPage({
  survey,
  link,
}: {
  survey: SurveyView;
  link: { url: string; qr: string };
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-10 text-center print:py-0">
      <div className="print:hidden">
        <PrintPage />
      </div>
      <h1 className="font-display text-4xl leading-tight text-deep-blue">{survey.title}</h1>
      <p className="text-xl text-charcoal/80">{t.share.scan}</p>
      <Image
        src={link.qr}
        alt={t.share.alt(survey.title)}
        width={480}
        height={480}
        unoptimized
        className="size-[min(480px,80vw)]"
      />
      <p className="break-all text-[15px] text-charcoal/70">{link.url}</p>
    </div>
  );
}

function Bar({ label, count, of }: { label: string; count: number; of: number }) {
  const percent = of > 0 ? Math.round((count / of) * 100) : 0;
  return (
    <li className="text-[13px]">
      <div className="flex justify-between gap-3">
        <span className="min-w-0 text-charcoal/85">{label}</span>
        <span className="shrink-0 text-charcoal/65">
          {count} · {percent}%
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-mint-mist">
        <div className="h-full rounded-full bg-emerald-brand" style={{ width: `${percent}%` }} />
      </div>
    </li>
  );
}

function QuestionSummary({ summary }: { summary: SurveyQuestionSummary }) {
  const r = t.results;
  const numeric = summary.type === "rating" || summary.type === "scale";
  return (
    <section className="rounded-3xl border border-hairline bg-white p-5">
      <h3 className="font-semibold text-deep-blue">{summary.label}</h3>
      <p className="mb-3 mt-0.5 text-[12px] text-charcoal/60">{r.answered(summary.answered)}</p>
      {summary.answered === 0 ? (
        <p className="text-[13px] text-charcoal/60">{r.noAnswers}</p>
      ) : numeric ? (
        <>
          <dl className="mb-3 flex flex-wrap gap-6">
            <div>
              <dt className="text-[11px] uppercase tracking-museum text-deep-blue/60">
                {r.average}
              </dt>
              <dd className="font-display text-2xl text-deep-blue">{summary.average}</dd>
            </div>
            {summary.nps !== null ? (
              <div>
                <dt className="text-[11px] uppercase tracking-museum text-deep-blue/60">{r.nps}</dt>
                <dd className="font-display text-2xl text-deep-blue">{summary.nps}</dd>
              </div>
            ) : null}
          </dl>
          <ul className="space-y-1.5">
            {summary.distribution.map((row) => (
              <Bar
                key={row.value}
                label={String(row.value)}
                count={row.count}
                of={summary.answered}
              />
            ))}
          </ul>
        </>
      ) : summary.options.length > 0 ? (
        <ul className="space-y-1.5">
          {summary.options.map((option) => (
            <Bar key={option.id} label={option.label} count={option.count} of={summary.answered} />
          ))}
        </ul>
      ) : (
        <ul className="space-y-2 text-[13.5px] text-charcoal/85">
          {summary.texts.map((text, index) => (
            <li key={index} className="rounded-xl bg-soft-white px-3 py-2">
              {text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SurveyResultsPage({
  survey,
  results,
  canExport,
}: {
  survey: SurveyView;
  results: SurveyResults;
  canExport: boolean;
}) {
  const r = t.results;
  const asked = survey.questions.filter((question) => question.type !== "section");
  const withPeople = !survey.settings.anonymous;
  return (
    <div className="mx-auto max-w-5xl">
      <BackToList />
      <h1 className="font-display text-3xl text-deep-blue">{survey.title}</h1>
      <p className="mb-6 mt-1 text-[13px] text-charcoal/65">{r.total(results.total)}</p>
      {canExport ? (
        <div className="mb-6">
          <SurveyExport surveyId={survey.id} />
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {results.questions.map((summary) => (
          <QuestionSummary key={summary.questionId} summary={summary} />
        ))}
      </div>
      {results.responses.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl text-deep-blue">{r.table}</h2>
          <div className="overflow-x-auto rounded-3xl border border-hairline bg-white">
            <table className="w-full min-w-[40rem] text-left text-[13px]">
              <thead className="bg-soft-white text-[11px] uppercase tracking-museum text-deep-blue/60">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {r.when}
                  </th>
                  {withPeople ? (
                    <>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {r.name}
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {r.email}
                      </th>
                    </>
                  ) : null}
                  {asked.map((question) => (
                    <th key={question.id} scope="col" className="px-4 py-3 font-semibold">
                      {question.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.responses.map((row) => (
                  <tr key={row.id} className="border-t border-hairline align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-charcoal/70">
                      {DATE_TIME.format(new Date(row.submittedAt))}
                    </td>
                    {withPeople ? (
                      <>
                        <td className="px-4 py-3">{row.name}</td>
                        <td className="px-4 py-3">{row.email}</td>
                      </>
                    ) : null}
                    {asked.map((question) => (
                      <td key={question.id} className="px-4 py-3">
                        {row.answers[question.id]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** "Khảo sát feedback" of the event editor: composed by the route (F2). */
export function EventSurveysSection({
  eventId,
  surveys,
  checkedIn,
  canWrite,
}: {
  eventId: string;
  surveys: SurveyView[];
  checkedIn: number;
  canWrite: boolean;
}) {
  const s = t.eventSection;
  return (
    <section
      id="khao-sat-feedback"
      aria-labelledby="khao-sat-feedback-title"
      className="scroll-mt-24 rounded-3xl border border-hairline bg-white p-5 shadow-ambient md:p-7"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="khao-sat-feedback-title" className="font-display text-xl text-deep-blue">
            {s.title}
          </h2>
          <p className="mt-1 text-[12.5px] text-charcoal/60">{s.hint}</p>
        </div>
        {canWrite ? (
          <Button
            as={Link}
            href={`/surveys/new?mau=1&su-kien=${eventId}`}
            variant="secondary"
            size="sm"
          >
            <FiPlus aria-hidden="true" size={14} />
            {s.create}
          </Button>
        ) : null}
      </div>
      {surveys.length === 0 ? (
        <p className="text-[13px] text-charcoal/60">{s.empty}</p>
      ) : (
        <ul className="divide-y divide-hairline text-[13px]">
          {surveys.map((survey) => (
            <li key={survey.id} className="flex flex-wrap justify-between gap-3 py-3">
              <Link
                href={`/surveys/${survey.id}`}
                className="font-semibold text-deep-blue hover:text-emerald-ink"
              >
                {survey.title}
              </Link>
              <span className="text-[12px] text-charcoal/60">
                {t.status[survey.status]} · {s.rate(survey.responseCount, checkedIn)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
