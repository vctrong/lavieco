"use client";

import { FiPlus, FiTrash2 } from "react-icons/fi";

import { BENEFIT_ICONS, EVENT_LIMITS, type BenefitIcon } from "@lavieco/shared/events";
import { SelectField, TextField, TextareaField } from "@lavieco/ui";

import { BENEFIT_ICON_COMPONENTS } from "../constants/benefit-icons";
import { TEXT } from "../constants/text";
import type { BenefitValue, SpeakerValue } from "../utils/details-values";
import { CoverField } from "./image-fields";

const t = TEXT.vi.editor;

function RemoveButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-deep-blue/60 hover:bg-mint-mist hover:text-deep-blue"
    >
      <FiTrash2 aria-hidden="true" size={15} />
    </button>
  );
}

function AddButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-dashed border-deep-blue/25 px-4 py-2 text-[13px] font-medium text-deep-blue hover:border-emerald-brand hover:bg-mint-mist"
    >
      <FiPlus aria-hidden="true" size={14} />
      {label}
    </button>
  );
}

type ListFieldProps<T> = {
  rows: T[];
  errors: Record<string, string>;
  savedIds?: ReadonlySet<string>;
  disabled?: boolean;
  onChange: (rows: T[]) => void;
};

/** "Người hướng dẫn": name, role, short bio and an optional portrait (with consent). */
export function SpeakersField({
  rows,
  errors,
  savedIds = new Set(),
  disabled,
  onChange,
}: ListFieldProps<SpeakerValue>) {
  const update = (index: number, next: Partial<SpeakerValue>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...next } : row)));
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={index} className="space-y-4 rounded-2xl border border-hairline bg-soft-white p-4">
          <div className="flex items-start gap-3">
            <div className="grid flex-1 gap-3 md:grid-cols-2">
              <TextField
                tone="light"
                label={t.fields.speakerName}
                value={row.name}
                disabled={disabled}
                error={errors[`speakers.${index}.name`]}
                onChange={(e) => update(index, { name: e.target.value })}
              />
              <TextField
                tone="light"
                label={t.fields.speakerRole}
                value={row.role}
                disabled={disabled}
                error={errors[`speakers.${index}.role`]}
                onChange={(e) => update(index, { role: e.target.value })}
              />
              <TextareaField
                tone="light"
                rows={2}
                label={t.fields.speakerBio}
                value={row.bio}
                maxLength={EVENT_LIMITS.speakerBioMax}
                disabled={disabled}
                error={errors[`speakers.${index}.bio`]}
                onChange={(e) => update(index, { bio: e.target.value })}
                wrapperClassName="md:col-span-2"
              />
            </div>
            <RemoveButton
              label={`${t.remove} ${index + 1}`}
              disabled={disabled}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            />
          </div>
          <CoverField
            label={t.fields.speakerAvatar}
            emptyText={TEXT.vi.images.avatarEmpty}
            frame="avatar"
            value={row.avatar}
            saved={row.avatar !== null && savedIds.has(row.avatar.mediaId)}
            disabled={Boolean(disabled)}
            error={errors[`speakers.${index}.avatar.alt`]}
            onChange={(avatar) => update(index, { avatar })}
          />
        </div>
      ))}
      {rows.length < EVENT_LIMITS.speakersMax ? (
        <AddButton
          label={t.add.speaker}
          disabled={disabled}
          onClick={() => onChange([...rows, { name: "", role: "", bio: "", avatar: null }])}
        />
      ) : null}
    </div>
  );
}

/** "Bạn sẽ nhận": an icon from the shared list, a title and a short description. */
export function BenefitsField({ rows, errors, disabled, onChange }: ListFieldProps<BenefitValue>) {
  const update = (index: number, next: Partial<BenefitValue>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...next } : row)));
  const options = BENEFIT_ICONS.map((icon) => ({ value: icon, label: t.benefitIcons[icon] }));
  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const Icon = BENEFIT_ICON_COMPONENTS[row.icon];
        return (
          <div
            key={index}
            className="flex items-start gap-3 rounded-2xl border border-hairline bg-soft-white p-4"
          >
            <span
              aria-hidden="true"
              className="mt-6 flex size-10 shrink-0 items-center justify-center rounded-full bg-mint-mist text-deep-blue"
            >
              <Icon size={18} />
            </span>
            <div className="grid flex-1 gap-3 md:grid-cols-2">
              <SelectField
                tone="light"
                label={t.fields.benefitIcon}
                value={row.icon}
                options={options}
                disabled={disabled}
                onChange={(e) => update(index, { icon: e.target.value as BenefitIcon })}
              />
              <TextField
                tone="light"
                label={t.fields.benefitTitle}
                value={row.title}
                maxLength={120}
                disabled={disabled}
                error={errors[`benefits.${index}.title`]}
                onChange={(e) => update(index, { title: e.target.value })}
              />
              <TextareaField
                tone="light"
                rows={2}
                label={t.fields.benefitDescription}
                value={row.description}
                maxLength={EVENT_LIMITS.benefitTextMax}
                disabled={disabled}
                error={errors[`benefits.${index}.description`]}
                onChange={(e) => update(index, { description: e.target.value })}
                wrapperClassName="md:col-span-2"
              />
            </div>
            <RemoveButton
              label={`${t.remove} ${index + 1}`}
              disabled={disabled}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            />
          </div>
        );
      })}
      {rows.length < EVENT_LIMITS.benefitsMax ? (
        <AddButton
          label={t.add.benefit}
          disabled={disabled}
          onClick={() => onChange([...rows, { icon: "leaf", title: "", description: "" }])}
        />
      ) : null}
    </div>
  );
}
