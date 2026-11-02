"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import {
  CAMPAIGN_CHECKIN_FILTERS,
  CAMPAIGN_LIMITS,
  CAMPAIGN_TYPES,
  type AudiencePreview,
  type CampaignType,
  type CampaignView,
} from "@lavieco/shared/events";
import { Button, FormAlert, SelectField, TextareaField, TextField } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { createCampaign, previewAudience, updateCampaign } from "../actions/campaigns";
import { TEXT } from "../constants/text";
import {
  emptyValues,
  parseManualList,
  toAudience,
  toCampaignRequest,
  valuesOf,
  type CampaignFormValues,
  type CtaChoice,
} from "../utils/values";

const t = TEXT.vi;
const f = t.form;

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-hairline bg-white p-5 shadow-ambient md:p-7">
      <h2 className="mb-5 font-display text-xl text-deep-blue">{title}</h2>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

export type CampaignChoices = {
  events: { id: string; title: string }[];
  surveys: { id: string; title: string }[];
};

/** Composer. Only a draft can be edited; what is queued has already been promised. */
export function CampaignForm({
  campaign,
  choices,
  onDirty,
}: {
  campaign: CampaignView | null;
  choices: CampaignChoices;
  onDirty?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CampaignFormValues>(() =>
    campaign ? valuesOf(campaign) : emptyValues(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [counting, setCounting] = useState(false);
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const locked = campaign !== null && campaign.status !== "draft";
  const disabled = busy || locked;

  const set = <K extends keyof CampaignFormValues>(key: K, value: CampaignFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
    onDirty?.(true);
  };

  /** A template replaces the text only when it is still what a template wrote. */
  const chooseType = (type: CampaignType) => {
    const template = type === "custom" ? null : t.templates[type];
    setValues((current) => ({
      ...current,
      type,
      ...(template
        ? { subject: template.subject, preheader: template.preheader, body: template.body }
        : {}),
    }));
    onDirty?.(true);
  };

  const count = async () => {
    setCounting(true);
    setAlert(null);
    const result = await callAction(() => previewAudience(toAudience(values)));
    setCounting(false);
    if (result.status === "ok") {
      setPreview(result.data);
      return;
    }
    setPreview(null);
    setAlert(result.status === "error" ? t.errors[result.reason] : t.errors.invalid);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setAlert(null);
    setErrors({});
    const body = toCampaignRequest(values);
    const result = await callAction(() =>
      campaign
        ? updateCampaign(campaign.id, { ...body, revision: campaign.revision })
        : createCampaign(body),
    );
    setBusy(false);
    if (result.status === "ok") {
      onDirty?.(false);
      if (campaign) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/campaigns/${result.data.id}`);
      }
      return;
    }
    if (result.status === "invalid") {
      setErrors(result.fieldErrors);
      setAlert(t.errors.invalid);
      return;
    }
    setAlert(t.errors[result.reason]);
  };

  const noneOption = { value: "", label: f.none };
  const eventOptions = [
    noneOption,
    ...choices.events.map((item) => ({ value: item.id, label: item.title })),
  ];
  const surveyOptions = [
    noneOption,
    ...choices.surveys.map((item) => ({ value: item.id, label: item.title })),
  ];
  const badLines = values.audienceType === "manual" ? parseManualList(values.manual).bad : 0;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Group title={f.content}>
        <TextField
          tone="light"
          label={f.name}
          value={values.name}
          maxLength={CAMPAIGN_LIMITS.nameMax}
          error={errors.name}
          disabled={disabled}
          onChange={(event) => set("name", event.target.value)}
        />
        <SelectField
          tone="light"
          label={f.type}
          hint={f.template}
          value={values.type}
          disabled={disabled}
          options={CAMPAIGN_TYPES.map((value) => ({ value, label: t.types[value] }))}
          onChange={(event) => chooseType(event.target.value as CampaignType)}
        />
        <TextField
          tone="light"
          label={f.subject}
          value={values.subject}
          maxLength={CAMPAIGN_LIMITS.subjectMax}
          error={errors.subject}
          disabled={disabled}
          wrapperClassName="md:col-span-2"
          onChange={(event) => set("subject", event.target.value)}
        />
        <TextField
          tone="light"
          label={f.preheader}
          value={values.preheader}
          maxLength={CAMPAIGN_LIMITS.preheaderMax}
          disabled={disabled}
          wrapperClassName="md:col-span-2"
          onChange={(event) => set("preheader", event.target.value)}
        />
        <TextareaField
          tone="light"
          rows={9}
          label={f.body}
          hint={f.bodyHint}
          value={values.body}
          maxLength={CAMPAIGN_LIMITS.bodyMax}
          error={errors.body}
          disabled={disabled}
          wrapperClassName="md:col-span-2"
          onChange={(event) => set("body", event.target.value)}
        />
        <SelectField
          tone="light"
          label={f.event}
          value={values.eventId}
          disabled={disabled}
          options={eventOptions}
          onChange={(event) => set("eventId", event.target.value)}
        />
        <SelectField
          tone="light"
          label={f.survey}
          value={values.surveyId}
          disabled={disabled}
          options={surveyOptions}
          onChange={(event) => set("surveyId", event.target.value)}
        />
        <SelectField
          tone="light"
          label={f.cta}
          value={values.ctaChoice}
          disabled={disabled}
          options={[
            { value: "none", label: f.ctaNone },
            { value: "url", label: f.ctaUrl },
            { value: "ticket", label: f.ctaTicket },
            { value: "survey", label: f.ctaSurvey },
          ]}
          onChange={(event) => set("ctaChoice", event.target.value as CtaChoice)}
        />
        {values.ctaChoice !== "none" ? (
          <TextField
            tone="light"
            label={f.ctaLabel}
            value={values.ctaLabel}
            maxLength={CAMPAIGN_LIMITS.ctaLabelMax}
            error={errors["cta.label"]}
            disabled={disabled}
            onChange={(event) => set("ctaLabel", event.target.value)}
          />
        ) : null}
        {values.ctaChoice === "url" ? (
          <TextField
            tone="light"
            label={f.ctaAddress}
            value={values.ctaUrl}
            error={errors["cta.url"]}
            disabled={disabled}
            wrapperClassName="md:col-span-2"
            onChange={(event) => set("ctaUrl", event.target.value)}
          />
        ) : null}
      </Group>

      <Group title={f.audience}>
        <SelectField
          tone="light"
          label={f.audienceType}
          value={values.audienceType}
          disabled={disabled}
          wrapperClassName="md:col-span-2"
          options={(["event", "past_buyers", "survey_respondents", "manual"] as const).map(
            (value) => ({ value, label: f.audienceTypes[value] }),
          )}
          onChange={(event) =>
            set("audienceType", event.target.value as CampaignFormValues["audienceType"])
          }
        />
        {values.audienceType === "event" ? (
          <>
            <SelectField
              tone="light"
              label={f.event}
              value={values.audienceEventId}
              error={errors["audience.eventId"]}
              disabled={disabled}
              options={eventOptions}
              onChange={(event) => set("audienceEventId", event.target.value)}
            />
            <SelectField
              tone="light"
              label={f.checkin}
              value={values.checkin}
              disabled={disabled}
              options={CAMPAIGN_CHECKIN_FILTERS.map((value) => ({
                value,
                label: f.checkins[value],
              }))}
              onChange={(event) =>
                set("checkin", event.target.value as CampaignFormValues["checkin"])
              }
            />
          </>
        ) : null}
        {values.audienceType === "past_buyers" ? (
          <>
            <TextField
              tone="light"
              type="date"
              label={f.from}
              value={values.from}
              disabled={disabled}
              onChange={(event) => set("from", event.target.value)}
            />
            <TextField
              tone="light"
              type="date"
              label={f.to}
              value={values.to}
              disabled={disabled}
              onChange={(event) => set("to", event.target.value)}
            />
            <TextField
              tone="light"
              inputMode="numeric"
              label={f.minOrders}
              value={values.minOrders}
              error={errors["audience.minOrders"]}
              disabled={disabled}
              onChange={(event) => set("minOrders", event.target.value)}
            />
          </>
        ) : null}
        {values.audienceType === "survey_respondents" ? (
          <SelectField
            tone="light"
            label={f.survey}
            value={values.audienceSurveyId}
            error={errors["audience.surveyId"]}
            disabled={disabled}
            wrapperClassName="md:col-span-2"
            options={surveyOptions}
            onChange={(event) => set("audienceSurveyId", event.target.value)}
          />
        ) : null}
        {values.audienceType === "manual" ? (
          <div className="md:col-span-2">
            <TextareaField
              tone="light"
              rows={7}
              label={f.manual}
              hint={f.manualHint}
              value={values.manual}
              error={errors["audience.entries"]}
              disabled={disabled}
              onChange={(event) => set("manual", event.target.value)}
            />
            {badLines > 0 ? (
              <p className="mt-1 text-[12.5px] text-deep-blue/75">{f.manualBad(badLines)}</p>
            ) : null}
          </div>
        ) : null}
        <div className="md:col-span-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={counting || locked}
            onClick={count}
          >
            {counting ? f.previewing : f.preview}
          </Button>
          {preview ? (
            <div role="status" className="mt-3 rounded-2xl bg-soft-white p-4 text-[13px]">
              <p className="font-semibold text-deep-blue">
                {f.previewResult(preview.count, preview.duplicates, preview.suppressed)}
              </p>
              <p className="mt-1 text-charcoal/70">{t.estimate(preview.estimatedDays)}</p>
              <ul className="mt-2 space-y-0.5 text-charcoal/75">
                {preview.samples.map((sample) => (
                  <li key={sample.email}>
                    {sample.email}
                    {sample.name ? ` · ${sample.name}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Group>

      <FormAlert message={alert} />
      {saved ? (
        <p role="status" className="text-[13px] font-medium text-emerald-ink">
          {f.saved}
        </p>
      ) : null}
      {locked ? null : (
        <Button type="submit" disabled={busy}>
          {busy ? f.saving : f.save}
        </Button>
      )}
    </form>
  );
}
