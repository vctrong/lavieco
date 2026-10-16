import { useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "../lib/cn";

/** `dark`: Deep Sea surfaces (default, existing forms). `light`: Soft White / white cards. */
export type FieldTone = "dark" | "light";

const TONES = {
  dark: {
    control:
      "border-hairline-light bg-soft-white/10 text-xs text-soft-white placeholder:text-soft-white/30",
    select: "bg-deep-blue",
    label: "text-mint-mist/70",
    error: "text-[11px] text-canary",
    checkbox: "border-hairline-light bg-soft-white/10",
    checkboxLabel: "text-[11.5px] text-mint-mist/80",
  },
  light: {
    control: "border-hairline bg-white text-sm text-charcoal placeholder:text-charcoal/40",
    select: "bg-white",
    label: "text-deep-blue/70",
    error: "text-xs text-deep-blue",
    checkbox: "border-hairline bg-white",
    checkboxLabel: "text-[12.5px] text-charcoal/75",
  },
} as const;

const CONTROL_CLASS =
  "w-full border px-4 transition-colors focus:border-emerald-brand focus:outline-none aria-[invalid=true]:border-canary";

type FieldShellProps = {
  label: string;
  error?: string;
  hint?: string;
  controlId: string;
  errorId: string;
  hintId: string;
  tone: FieldTone;
  children: ReactNode;
  className?: string;
};

function FieldShell({
  label,
  error,
  hint,
  controlId,
  errorId,
  hintId,
  tone,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={className}>
      <label
        htmlFor={controlId}
        className={cn(
          "mb-1.5 block text-[11px] font-medium uppercase tracking-museum",
          TONES[tone].label,
        )}
      >
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className={cn("mt-1.5 text-[11.5px] opacity-80", TONES[tone].label)}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className={cn("mt-1.5", TONES[tone].error)}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type WithFieldProps<T> = T & {
  label: string;
  error?: string;
  /** Helper text under the control, hidden while an error is shown. */
  hint?: string;
  tone?: FieldTone;
  wrapperClassName?: string;
};

function describedBy(
  error: string | undefined,
  hint: string | undefined,
  ids: { error: string; hint: string },
) {
  if (error) return ids.error;
  return hint ? ids.hint : undefined;
}

/** Text input. Dark surfaces by default; `tone="light"` on white cards. */
export function TextField({
  label,
  error,
  hint,
  tone = "dark",
  wrapperClassName,
  className,
  ...rest
}: WithFieldProps<InputHTMLAttributes<HTMLInputElement>>) {
  const id = useId();
  const ids = { error: `${id}-error`, hint: `${id}-hint` };
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      tone={tone}
      controlId={id}
      errorId={ids.error}
      hintId={ids.hint}
      className={wrapperClassName}
    >
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error, hint, ids)}
        className={cn(CONTROL_CLASS, TONES[tone].control, "rounded-full py-2.5", className)}
        {...rest}
      />
    </FieldShell>
  );
}

type SelectOption = { value: string; label: string };

/** Select. */
export function SelectField({
  label,
  error,
  hint,
  tone = "dark",
  wrapperClassName,
  className,
  options,
  ...rest
}: WithFieldProps<SelectHTMLAttributes<HTMLSelectElement>> & {
  options: readonly SelectOption[];
}) {
  const id = useId();
  const ids = { error: `${id}-error`, hint: `${id}-hint` };
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      tone={tone}
      controlId={id}
      errorId={ids.error}
      hintId={ids.hint}
      className={wrapperClassName}
    >
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error, hint, ids)}
        className={cn(
          CONTROL_CLASS,
          TONES[tone].control,
          TONES[tone].select,
          "rounded-full py-2.5",
          className,
        )}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** Textarea. */
export function TextareaField({
  label,
  error,
  hint,
  tone = "dark",
  wrapperClassName,
  className,
  ...rest
}: WithFieldProps<TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  const id = useId();
  const ids = { error: `${id}-error`, hint: `${id}-hint` };
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      tone={tone}
      controlId={id}
      errorId={ids.error}
      hintId={ids.hint}
      className={wrapperClassName}
    >
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error, hint, ids)}
        className={cn(
          CONTROL_CLASS,
          TONES[tone].control,
          "resize-none rounded-2xl py-2",
          className,
        )}
        {...rest}
      />
    </FieldShell>
  );
}

/** Checkbox with an inline label (used for the data-processing consent). */
export function CheckboxField({
  label,
  error,
  tone = "dark",
  wrapperClassName,
  className,
  ...rest
}: WithFieldProps<Omit<InputHTMLAttributes<HTMLInputElement>, "type">>) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={wrapperClassName}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "mt-0.5 size-4 shrink-0 cursor-pointer rounded border accent-emerald-brand",
            TONES[tone].checkbox,
            className,
          )}
          {...rest}
        />
        <label htmlFor={id} className={cn("leading-relaxed", TONES[tone].checkboxLabel)}>
          {label}
        </label>
      </div>
      {error ? (
        <p id={errorId} role="alert" className={cn("mt-1.5", TONES[tone].error)}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
