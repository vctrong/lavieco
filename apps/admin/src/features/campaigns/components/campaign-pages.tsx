import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiPlus } from "react-icons/fi";

import type { CampaignList, CampaignRecipientList, CampaignView } from "@lavieco/shared/events";
import { Button } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { CampaignMoves, CampaignPreview, CampaignSendPanel } from "./campaign-controls";
import { CampaignForm, type CampaignChoices } from "./campaign-form";

const t = TEXT.vi;
const DATE_TIME = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  dateStyle: "short",
  timeStyle: "short",
});

function BackToList() {
  return (
    <Link
      href="/campaigns"
      className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-deep-blue/70 hover:text-deep-blue"
    >
      <FiArrowLeft aria-hidden="true" size={13} />
      {t.back}
    </Link>
  );
}

const statusLine = (campaign: CampaignView) =>
  campaign.source === "post_event" && campaign.status === "draft"
    ? t.awaitingReview
    : t.status[campaign.status];

/** `/campaigns`. A draft from "Sau sự kiện" says it is waiting for someone to review it. */
export function CampaignsListPage({ page }: { page: CampaignList }) {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-museum text-deep-blue/60">
            {t.eyebrow}
          </p>
          <h1 className="font-display text-3xl text-deep-blue md:text-4xl">{t.title}</h1>
          <p className="mt-2 max-w-2xl text-[14.5px] text-charcoal/75">{t.intro}</p>
        </div>
        <Button as={Link} href="/campaigns/new" size="sm">
          <FiPlus aria-hidden="true" size={15} />
          {t.create}
        </Button>
      </header>
      <section className="overflow-hidden rounded-3xl border border-hairline bg-white shadow-ambient">
        {page.items.length === 0 ? (
          <p className="px-5 py-16 text-center text-[14px] text-charcoal/60">{t.empty}</p>
        ) : (
          <ul>
            {page.items.map((campaign) => (
              <li
                key={campaign.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="font-display text-lg text-deep-blue hover:text-emerald-ink"
                  >
                    {campaign.name}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-charcoal/60">
                    {t.types[campaign.type]} · {statusLine(campaign)}
                  </p>
                </div>
                <p className="text-[13px] text-charcoal/75">
                  {t.counters(campaign.counters.sent, campaign.counters.total)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {page.nextCursor ? (
        <div className="mt-5 flex justify-end">
          <Link
            href={`/campaigns?cursor=${encodeURIComponent(page.nextCursor)}`}
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

export function NewCampaignPage({ choices }: { choices: CampaignChoices }) {
  return (
    <div className="mx-auto max-w-4xl">
      <BackToList />
      <h1 className="mb-8 font-display text-3xl text-deep-blue md:text-4xl">{t.meta.create}</h1>
      <CampaignForm campaign={null} choices={choices} />
    </div>
  );
}

function Progress({ campaign }: { campaign: CampaignView }) {
  const { total, sent, failed, skipped } = campaign.counters;
  const percent = total > 0 ? Math.round(((sent + failed + skipped) / total) * 100) : 0;
  return (
    <section className="rounded-3xl border border-hairline bg-white p-5 shadow-ambient">
      <p className="font-display text-2xl text-deep-blue">{t.counters(sent, total)}</p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-3 h-2 overflow-hidden rounded-full bg-mint-mist"
      >
        <div className="h-full rounded-full bg-emerald-brand" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 text-[12.5px] text-charcoal/70">
        {failed > 0 ? <span>{t.failedCount(failed)}</span> : null}
        {skipped > 0 ? <span>{t.skippedCount(skipped)}</span> : null}
        {campaign.estimatedDays > 0 && campaign.status === "sending" ? (
          <span>{t.estimate(campaign.estimatedDays)}</span>
        ) : null}
      </p>
    </section>
  );
}

function Recipients({
  campaign,
  recipients,
}: {
  campaign: CampaignView;
  recipients: CampaignRecipientList;
}) {
  const r = t.recipients;
  return (
    <section>
      <h2 className="mb-3 font-display text-xl text-deep-blue">{r.title}</h2>
      {recipients.items.length === 0 ? (
        <p className="text-[13px] text-charcoal/60">{r.none}</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-hairline bg-white">
          <table className="w-full min-w-[36rem] text-left text-[13px]">
            <thead className="bg-soft-white text-[11px] uppercase tracking-museum text-deep-blue/60">
              <tr>
                {[r.email, r.name, r.status, r.sentAt].map((title) => (
                  <th key={title} scope="col" className="px-4 py-3 font-semibold">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recipients.items.map((row) => (
                <tr key={row.id} className="border-t border-hairline">
                  <td className="px-4 py-2.5">{row.email}</td>
                  <td className="px-4 py-2.5">{row.name}</td>
                  <td className="px-4 py-2.5">
                    {t.recipientStatus[row.status]}
                    {row.error ? (
                      <span className="block text-[11.5px] text-charcoal/60">{row.error}</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-charcoal/70">
                    {row.sentAt ? DATE_TIME.format(new Date(row.sentAt)) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {recipients.nextCursor ? (
        <Link
          href={`/campaigns/${campaign.id}?nguoi-nhan=${encodeURIComponent(recipients.nextCursor)}`}
          className="mt-3 inline-flex rounded-full border border-hairline px-4 py-2 text-[12.5px] text-deep-blue hover:bg-mint-mist"
        >
          {r.more}
        </Link>
      ) : null}
    </section>
  );
}

export function CampaignPage({
  campaign,
  recipients,
  choices,
}: {
  campaign: CampaignView;
  recipients: CampaignRecipientList;
  choices: CampaignChoices;
}) {
  const draft = campaign.status === "draft";
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackToList />
        <h1 className="font-display text-3xl text-deep-blue">{campaign.name}</h1>
        <p className="mt-1 text-[13px] text-charcoal/65">
          {t.types[campaign.type]} · {statusLine(campaign)}
        </p>
      </div>
      {draft ? null : (
        <>
          <Progress campaign={campaign} />
          <CampaignMoves campaign={campaign} />
        </>
      )}
      {draft ? (
        <CampaignSendPanel campaign={campaign} />
      ) : (
        <CampaignPreview campaignId={campaign.id} />
      )}
      {draft ? null : <Recipients campaign={campaign} recipients={recipients} />}
      <CampaignForm campaign={campaign} choices={choices} />
    </div>
  );
}
