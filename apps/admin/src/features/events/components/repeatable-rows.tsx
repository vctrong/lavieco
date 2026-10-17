"use client";

import { FiPlus, FiTrash2 } from "react-icons/fi";

import { TextField, TextareaField } from "@lavieco/ui";

import { TEXT } from "../constants/text";

type Column<T> = {
  key: keyof T & string;
  label: string;
  multiline?: boolean;
  width?: string;
};

type RepeatableRowsProps<T extends Record<string, string>> = {
  name: string;
  rows: T[];
  columns: Column<T>[];
  empty: T;
  max: number;
  addLabel: string;
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (rows: T[]) => void;
};

/** Small list editor for speakers, agenda and FAQ (capped like the stored arrays). */
export function RepeatableRows<T extends Record<string, string>>({
  name,
  rows,
  columns,
  empty,
  max,
  addLabel,
  errors,
  disabled,
  onChange,
}: RepeatableRowsProps<T>) {
  const t = TEXT.vi.editor;
  const update = (index: number, key: keyof T, value: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-2xl border border-hairline bg-soft-white p-4 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))_auto] md:items-start"
          style={{ ["--cols" as string]: columns.length }}
        >
          {columns.map((column) =>
            column.multiline ? (
              <TextareaField
                key={column.key}
                tone="light"
                rows={3}
                label={column.label}
                value={row[column.key]}
                disabled={disabled}
                error={errors[`${name}.${index}.${column.key}`]}
                onChange={(event) => update(index, column.key, event.target.value)}
              />
            ) : (
              <TextField
                key={column.key}
                tone="light"
                label={column.label}
                value={row[column.key]}
                disabled={disabled}
                error={errors[`${name}.${index}.${column.key}`]}
                onChange={(event) => update(index, column.key, event.target.value)}
              />
            ),
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            aria-label={`${t.remove} ${index + 1}`}
            className="flex size-9 items-center justify-center self-end rounded-full text-deep-blue/60 hover:bg-mint-mist hover:text-deep-blue md:mt-6"
          >
            <FiTrash2 aria-hidden="true" size={15} />
          </button>
        </div>
      ))}
      {rows.length < max ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...rows, { ...empty }])}
          className="flex items-center gap-2 rounded-full border border-dashed border-deep-blue/25 px-4 py-2 text-[13px] font-medium text-deep-blue hover:border-emerald-brand hover:bg-mint-mist"
        >
          <FiPlus aria-hidden="true" size={14} />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}
