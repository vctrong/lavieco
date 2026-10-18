"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FiLock } from "react-icons/fi";

import {
  EVENT_FORMATS,
  EVENT_KINDS,
  EVENT_LIMITS,
  eventCreateRequestSchema,
  eventUpdateRequestSchema,
  type EventType,
  type EventView,
} from "@lavieco/shared/events";
import { Button, CheckboxField, SelectField, TextField, TextareaField, cn } from "@lavieco/ui";

import { createEvent, updateEvent } from "../actions/events";
import { TEXT } from "../constants/text";
import { fieldErrorsOf } from "../schemas";
import {
  detailsOf,
  emptyDetails,
  savedImageIds,
  toDetailsRequest,
  type DetailsValues,
} from "../utils/details-values";
import { EditorSection } from "./editor-section";
import { FormAlert } from "./form-alert";
import { CoverField, GalleryField } from "./image-fields";
import { RepeatableRows } from "./repeatable-rows";

type DetailsFormProps = {
  event: EventView | null;
  types: EventType[];
  canWrite: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

function KindPicker({
  value,
  onChange,
}: {
  value: DetailsValues["kind"];
  onChange: (kind: DetailsValues["kind"]) => void;
}) {
  const t = TEXT.vi;
  return (
    <fieldset className="mb-6">
      <legend className="mb-2 text-[11px] font-medium uppercase tracking-museum text-deep-blue/70">
        {t.editor.kindLabel}
      </legend>
      <div className="grid gap-3 md:grid-cols-2">
        {EVENT_KINDS.map((kind) => (
          <label
            key={kind}
            className={cn(
              "cursor-pointer rounded-2xl border p-4 transition-colors",
              value === kind
                ? "border-emerald-brand bg-mint-mist"
                : "border-hairline bg-white hover:bg-soft-white",
            )}
          >
            <span className="flex items-center gap-2 text-[14px] font-semibold text-deep-blue">
              <input
                type="radio"
                name="kind"
                value={kind}
                checked={value === kind}
                onChange={() => onChange(kind)}
                className="accent-emerald-brand"
              />
              {t.kind[kind]}
            </span>
            <span className="mt-1 block text-[12.5px] leading-relaxed text-charcoal/65">
              {t.editor.kindHelp[kind]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Sections 1–6 of the editor: details, time and place, people, agenda, safety notes,
 * cancellation policy and FAQ. Creating saves a draft and opens the full editor.
 */
export function DetailsForm({ event, types, canWrite, onDirtyChange }: DetailsFormProps) {
  const t = TEXT.vi;
  const router = useRouter();
  const selectableTypes = types.filter((type) => !type.archived || type.id === event?.typeId);
  const [values, setValues] = useState<DetailsValues>(() =>
    event ? detailsOf(event) : emptyDetails(selectableTypes[0]?.id ?? ""),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const disabled = busy || !canWrite;
  const savedIds = savedImageIds(event);

  const set = <K extends keyof DetailsValues>(key: K, value: DetailsValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setAlert(null);
    onDirtyChange?.(true);
  };

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (busy || !canWrite) return;
    const body = toDetailsRequest(values);
    const schema = event ? eventUpdateRequestSchema : eventCreateRequestSchema;
    const input = event ? { ...body, revision: event.revision } : { ...body, kind: values.kind };
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      setAlert({ tone: "error", message: t.errors.invalid });
      return;
    }
    setErrors({});
    setBusy(true);
    if (event) {
      const result = await updateEvent(event.id, input).catch(() => null);
      setBusy(false);
      if (result?.status === "ok") {
        onDirtyChange?.(false);
        setAlert({ tone: "success", message: t.editor.saved });
        router.refresh();
        return;
      }
      if (result?.status === "invalid") setErrors(result.fieldErrors);
      setAlert({
        tone: "error",
        message: result?.status === "error" ? t.errors[result.reason] : t.errors.unavailable,
      });
      return;
    }
    const result = await createEvent(input).catch(() => null);
    if (result?.status === "ok") {
      onDirtyChange?.(false);
      router.push(`/events/${result.data.id}`);
      return;
    }
    setBusy(false);
    if (result?.status === "invalid") setErrors(result.fieldErrors);
    setAlert({
      tone: "error",
      message: result?.status === "error" ? t.errors[result.reason] : t.errors.unavailable,
    });
  };

  const typeOptions = selectableTypes.map((type) => ({
    value: type.id,
    label: type.archived ? `${type.name.vi} (${t.types.archived})` : type.name.vi,
  }));

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <EditorSection
        id="thong-tin"
        index={1}
        title={t.editor.sections.basics}
        hint={t.editor.sections.basicsHint}
      >
        {event ? null : <KindPicker value={values.kind} onChange={(kind) => set("kind", kind)} />}
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            tone="light"
            label={t.editor.fields.title}
            value={values.title}
            maxLength={EVENT_LIMITS.titleMax}
            onChange={(e) => set("title", e.target.value)}
            error={errors.title}
            disabled={disabled}
            wrapperClassName="md:col-span-2"
          />
          <SelectField
            tone="light"
            label={t.editor.fields.type}
            value={values.typeId}
            options={typeOptions}
            onChange={(e) => set("typeId", e.target.value)}
            error={errors.typeId}
            disabled={disabled}
          />
          {event?.slugLocked ? (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-museum text-deep-blue/70">
                {t.editor.fields.slug}
              </p>
              <p className="flex items-center gap-2 rounded-full border border-hairline bg-soft-white px-4 py-2.5 text-sm text-charcoal/70">
                <FiLock aria-hidden="true" size={13} />/{event.slug}
              </p>
              <p className="mt-1.5 text-[11.5px] text-deep-blue/60">{t.editor.fields.slugLocked}</p>
            </div>
          ) : (
            <TextField
              tone="light"
              label={t.editor.fields.slug}
              hint={t.editor.fields.slugHint}
              value={values.slug}
              maxLength={EVENT_LIMITS.slugMax}
              onChange={(e) => set("slug", e.target.value.toLowerCase())}
              error={errors.slug}
              disabled={disabled}
            />
          )}
          <TextareaField
            tone="light"
            rows={2}
            label={t.editor.fields.summary}
            value={values.summary}
            maxLength={EVENT_LIMITS.summaryMax}
            onChange={(e) => set("summary", e.target.value)}
            error={errors.summary}
            disabled={disabled}
            wrapperClassName="md:col-span-2"
          />
          <TextareaField
            tone="light"
            rows={8}
            label={t.editor.fields.description}
            hint={t.editor.fields.descriptionHint}
            value={values.description}
            maxLength={EVENT_LIMITS.descriptionMax}
            onChange={(e) => set("description", e.target.value)}
            error={errors.description}
            disabled={disabled}
            wrapperClassName="md:col-span-2"
          />
          <div className="md:col-span-2">
            <CoverField
              value={values.cover}
              saved={values.cover !== null && savedIds.has(values.cover.mediaId)}
              disabled={disabled}
              error={errors["cover.alt"]}
              onChange={(cover) => set("cover", cover)}
            />
          </div>
          <div className="md:col-span-2">
            <GalleryField
              items={values.gallery}
              savedIds={savedIds}
              disabled={disabled}
              errors={errors}
              onChange={(gallery) => set("gallery", gallery)}
            />
          </div>
        </div>
      </EditorSection>

      <EditorSection
        id="thoi-gian"
        index={2}
        title={t.editor.sections.time}
        hint={t.editor.sections.timeHint}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField
            tone="light"
            label={t.editor.fields.format}
            value={values.format}
            options={EVENT_FORMATS.map((format) => ({ value: format, label: t.format[format] }))}
            onChange={(e) => set("format", e.target.value as DetailsValues["format"])}
            disabled={disabled}
            wrapperClassName="md:col-span-2"
          />
          <TextField
            tone="light"
            type="datetime-local"
            label={t.editor.fields.startAt}
            value={values.startLocal}
            onChange={(e) => set("startLocal", e.target.value)}
            error={errors.startAt}
            disabled={disabled}
          />
          <TextField
            tone="light"
            type="datetime-local"
            label={t.editor.fields.endAt}
            value={values.endLocal}
            onChange={(e) => set("endLocal", e.target.value)}
            error={errors.endAt}
            disabled={disabled}
          />
          {values.format === "offline" ? (
            <>
              <TextField
                tone="light"
                label={t.editor.fields.venueName}
                value={values.venueName}
                onChange={(e) => set("venueName", e.target.value)}
                error={errors["venue.name"]}
                disabled={disabled}
              />
              <TextField
                tone="light"
                label={t.editor.fields.venueAddress}
                value={values.venueAddress}
                onChange={(e) => set("venueAddress", e.target.value)}
                error={errors["venue.address"]}
                disabled={disabled}
              />
              <TextField
                tone="light"
                type="url"
                label={t.editor.fields.mapUrl}
                value={values.mapUrl}
                onChange={(e) => set("mapUrl", e.target.value)}
                error={errors["venue.mapUrl"]}
                disabled={disabled}
                wrapperClassName="md:col-span-2"
              />
            </>
          ) : (
            <TextField
              tone="light"
              type="url"
              label={t.editor.fields.onlineUrl}
              hint={t.editor.fields.onlineUrlHint}
              value={values.onlineUrl}
              onChange={(e) => set("onlineUrl", e.target.value)}
              error={errors.onlineUrl}
              disabled={disabled}
              wrapperClassName="md:col-span-2"
            />
          )}
        </div>
      </EditorSection>

      <EditorSection
        id="nguoi-huong-dan"
        index={3}
        title={t.editor.sections.people}
        hint={t.editor.sections.peopleHint}
      >
        <RepeatableRows
          name="speakers"
          rows={values.speakers}
          columns={[
            { key: "name", label: t.editor.fields.speakerName },
            { key: "role", label: t.editor.fields.speakerRole },
          ]}
          empty={{ name: "", role: "" }}
          max={EVENT_LIMITS.speakersMax}
          addLabel={t.editor.add.speaker}
          errors={errors}
          disabled={disabled}
          onChange={(rows) => set("speakers", rows)}
        />
      </EditorSection>

      <EditorSection id="lich-trinh" index={4} title={t.editor.sections.agenda}>
        <RepeatableRows
          name="agenda"
          rows={values.agenda}
          columns={[
            { key: "time", label: t.editor.fields.agendaTime },
            { key: "title", label: t.editor.fields.agendaTitle },
          ]}
          empty={{ time: "", title: "" }}
          max={EVENT_LIMITS.agendaMax}
          addLabel={t.editor.add.agenda}
          errors={errors}
          disabled={disabled}
          onChange={(rows) => set("agenda", rows)}
        />
      </EditorSection>

      <EditorSection
        id="luu-y"
        index={5}
        title={t.editor.sections.safety}
        hint={t.editor.sections.safetyHint}
      >
        <div className="grid gap-5">
          <TextareaField
            tone="light"
            rows={4}
            label={t.editor.fields.safetyNotes}
            placeholder={t.editor.fields.safetyPlaceholder}
            value={values.safetyNotes}
            maxLength={EVENT_LIMITS.safetyNotesMax}
            onChange={(e) => set("safetyNotes", e.target.value)}
            error={errors.safetyNotes}
            disabled={disabled}
          />
          <TextareaField
            tone="light"
            rows={4}
            label={t.editor.fields.cancellationPolicy}
            value={values.cancellationPolicy}
            maxLength={EVENT_LIMITS.cancellationPolicyMax}
            onChange={(e) => set("cancellationPolicy", e.target.value)}
            error={errors.cancellationPolicy}
            disabled={disabled}
          />
          <CheckboxField
            tone="light"
            label={t.editor.fields.forChildren}
            checked={values.forChildren}
            onChange={(e) => set("forChildren", e.target.checked)}
            disabled={disabled}
          />
          <p className="-mt-3 text-[12px] text-charcoal/60">{t.editor.fields.forChildrenHint}</p>
        </div>
      </EditorSection>

      <EditorSection id="hoi-dap" index={6} title={t.editor.sections.faq}>
        <RepeatableRows
          name="faq"
          rows={values.faq}
          columns={[
            { key: "question", label: t.editor.fields.faqQuestion },
            { key: "answer", label: t.editor.fields.faqAnswer, multiline: true },
          ]}
          empty={{ question: "", answer: "" }}
          max={EVENT_LIMITS.faqMax}
          addLabel={t.editor.add.faq}
          errors={errors}
          disabled={disabled}
          onChange={(rows) => set("faq", rows)}
        />
      </EditorSection>

      {canWrite ? (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-full border border-hairline bg-white/95 px-4 py-3 shadow-float-dock backdrop-blur">
          <FormAlert
            message={alert?.message ?? null}
            tone={alert?.tone}
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={busy} size="sm" className="disabled:opacity-70">
            {busy ? t.editor.saving : event ? t.editor.save : t.editor.createDraft}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
