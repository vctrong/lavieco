"use client";

import { useMemo } from "react";

import { cn } from "../lib/cn";
import { SelectField, TextField, type FieldTone } from "./form-fields";

/** Shape of `@lavieco/shared/geo` `VN_PROVINCES` (passed in: the UI kit holds no data). */
export type AddressProvince = {
  readonly code: number;
  readonly name: string;
  readonly wards: readonly (readonly [number, string])[];
};

/** `provinceCode: "other"` is the free-text choice ("Khác"), offered only when allowed. */
export type AddressValue = {
  provinceCode: number | "other" | null;
  wardCode: number | null;
  detail: string;
};

export type AddressPickerText = {
  province: string;
  ward: string;
  choose: string;
  other: string;
  detail: string;
  detailHint?: string;
  detailOther: string;
};

const OTHER = "other";

/**
 * Province → ward/commune (two levels since July 2025) and a detail line. With
 * `allowOther`, "Khác" disables the ward list and keeps only the free line, for places
 * like "Cổng trường, 3h chiều". Text comes from the caller's `text.ts`.
 */
export function AddressPicker({
  provinces,
  value,
  onChange,
  text,
  tone,
  allowOther = false,
  required = false,
  errors = {},
  idPrefix,
  className,
}: {
  provinces: readonly AddressProvince[];
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  text: AddressPickerText;
  tone: FieldTone;
  allowOther?: boolean;
  required?: boolean;
  errors?: { province?: string; ward?: string; detail?: string };
  /** Stable ids so a form can focus the first field with an error. */
  idPrefix: string;
  className?: string;
}) {
  const other = value.provinceCode === OTHER;
  const wards = useMemo(
    () =>
      typeof value.provinceCode === "number"
        ? (provinces.find((province) => province.code === value.provinceCode)?.wards ?? [])
        : [],
    [provinces, value.provinceCode],
  );
  const provinceOptions = [
    { value: "", label: text.choose },
    ...provinces.map((province) => ({ value: String(province.code), label: province.name })),
    ...(allowOther ? [{ value: OTHER, label: text.other }] : []),
  ];
  const wardOptions = [
    { value: "", label: text.choose },
    ...wards.map(([code, name]) => ({ value: String(code), label: name })),
  ];
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <SelectField
        id={`${idPrefix}-province`}
        tone={tone}
        label={text.province}
        required={required}
        error={errors.province}
        value={value.provinceCode === null ? "" : String(value.provinceCode)}
        options={provinceOptions}
        onChange={(event) => {
          const raw = event.target.value;
          onChange({
            provinceCode: raw === "" ? null : raw === OTHER ? OTHER : Number(raw),
            wardCode: null,
            detail: value.detail,
          });
        }}
      />
      <SelectField
        id={`${idPrefix}-ward`}
        tone={tone}
        label={text.ward}
        required={required && !other}
        error={errors.ward}
        disabled={other || wards.length === 0}
        value={value.wardCode === null ? "" : String(value.wardCode)}
        options={wardOptions}
        onChange={(event) =>
          onChange({
            ...value,
            wardCode: event.target.value === "" ? null : Number(event.target.value),
          })
        }
      />
      <TextField
        id={`${idPrefix}-detail`}
        tone={tone}
        label={other ? text.detailOther : text.detail}
        hint={text.detailHint}
        required={required}
        error={errors.detail}
        value={value.detail}
        maxLength={200}
        autoComplete="street-address"
        wrapperClassName="sm:col-span-2"
        onChange={(event) => onChange({ ...value, detail: event.target.value })}
      />
    </div>
  );
}
