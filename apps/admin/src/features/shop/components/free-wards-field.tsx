"use client";

import { useState } from "react";
import { FiX } from "react-icons/fi";

import { VN_PROVINCES, findProvince } from "@lavieco/shared/geo";
import { SelectField, choiceControlClass } from "@lavieco/ui";

import { TEXT } from "../constants/text";

const t = TEXT.vi.settings;
const CAN_THO = 92;

const nameOf = (code: number) => {
  for (const province of VN_PROVINCES) {
    const ward = province.wards.find(([wardCode]) => wardCode === code);
    if (ward) return `${ward[1]}, ${province.name}`;
  }
  return String(code);
};

/**
 * Wards delivered free (settings `freeShippingWardCodes`): pick a province, tick its
 * wards; the chosen ones stay listed as chips, whatever province they are in.
 */
export function FreeWardsField({
  value,
  onChange,
  disabled,
}: {
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
}) {
  const [provinceCode, setProvinceCode] = useState(CAN_THO);
  const wards = findProvince(provinceCode)?.wards ?? [];
  const toggle = (code: number) =>
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  return (
    <fieldset className="space-y-3">
      <legend className="text-[14px] font-semibold text-charcoal">{t.freeWards}</legend>
      <p className="text-[13px] text-charcoal/70">{t.freeWardsHint}</p>
      {value.length ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((code) => (
            <li key={code}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(code)}
                aria-label={t.removeWard(nameOf(code))}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-mint-mist px-3 text-[13px] text-charcoal hover:bg-mint-mist/70"
              >
                {nameOf(code)}
                <FiX aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-charcoal/60">{t.noFreeWards}</p>
      )}
      <SelectField
        tone="light"
        label={t.freeWardsProvince}
        value={String(provinceCode)}
        disabled={disabled}
        options={VN_PROVINCES.map((p) => ({ value: String(p.code), label: p.name }))}
        onChange={(event) => setProvinceCode(Number(event.target.value))}
      />
      <ul className="grid max-h-64 gap-1 overflow-y-auto rounded-2xl border border-hairline p-2 sm:grid-cols-2">
        {wards.map(([code, name]) => (
          <li key={code}>
            <label className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-[14px] hover:bg-mint-mist">
              <input
                type="checkbox"
                checked={value.includes(code)}
                disabled={disabled}
                onChange={() => toggle(code)}
                className={choiceControlClass("light", "size-5")}
              />
              {name}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
