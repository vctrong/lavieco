import { useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { FiAlertCircle } from "react-icons/fi";

import { cn } from "../lib/cn";

/** `dark`: Deep Sea surfaces (default, existing forms). `light`: Soft White / white cards. */
export type FieldTone = "dark" | "light";

const TONES = {
  dark: {
    control:
      "border-hairline-light bg-soft-white/10 text-xs text-soft-white placeholder:text-soft-white/30 aria-[invalid=true]:border-error-on-dark",
    select: "bg-deep-blue",
    label: "text-mint-mist/70",
    // Error red is too dark on Deep Sea: its light counterpart, never Canary (warnings).
    error: "text-[11px] text-error-on-dark",
    required: "text-error-on-dark",
    checkbox:
      "border-hairline-light bg-soft-white/10 aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-error-on-dark",
    checkboxLabel: "text-[11.5px] text-mint-mist/80",
  },
  light: {
    control:
      "border-hairline bg-white text-sm text-charcoal placeholder:text-charcoal/40 aria-[invalid=true]:border-error",
    select: "bg-white",
    label: "text-deep-blue/70",
    error: "text-xs text-error",
    required: "text-error",
    checkbox:
      "border-hairline bg-white aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-error",
    checkboxLabel: "text-[12.5px] text-charcoal/75",
  },
} as const;

const CONTROL_CLASS =
  "w-full border px-4 transition-colors focus:border-emerald-brand focus:outline-none";

/** `*` after the label of a required field; the control itself carries `required`. */
function RequiredMark({ tone }: { tone: FieldTone }) {
  return (
    <span aria-hidden="true" className={cn("ml-0.5", TONES[tone].required)}>
      *
    </span>
  );
}

/** Field message with an icon, linked to the control by `aria-describedby`. */
export function FieldError({
  id,
  message,
  tone = "light",
  className,
}: {
  id: string;
  message: string;
  tone?: FieldTone;
  className?: string;
}) {
  return (
    <p
      id={id}
      role="alert"
      className={cn("mt-1.5 flex items-start gap-1.5", TONES[tone].error, className)}
    >
      <FiAlertCircle aria-hidden="true" size={13} className="mt-px shrink-0" />
      <span>{message}</span>
    </p>
  );
}

type FieldShellProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
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
  required,
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
        {required ? <RequiredMark tone={tone} /> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className={cn("mt-1.5 text-[11.5px] opacity-80", TONES[tone].label)}>
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={errorId} message={error} tone={tone} /> : null}
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

/** Control id: the caller's (to link an error summary to it) or a generated one. */
function useControlIds(id: string | undefined) {
  const generated = useId();
  const controlId = id ?? generated;
  return { controlId, error: `${controlId}-error`, hint: `${controlId}-hint` };
}

/** Text input. Dark surfaces by default; `tone="light"` on white cards. */
export function TextField({
  label,
  error,
  hint,
  tone = "dark",
  wrapperClassName,
  className,
  id,
  required,
  ...rest
}: WithFieldProps<InputHTMLAttributes<HTMLInputElement>>) {
  const ids = useControlIds(id);
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      tone={tone}
      controlId={ids.controlId}
      errorId={ids.error}
      hintId={ids.hint}
      className={wrapperClassName}
    >
      <input
        id={ids.controlId}
        required={required}
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
  id,
  required,
  ...rest
}: WithFieldProps<SelectHTMLAttributes<HTMLSelectElement>> & {
  options: readonly SelectOption[];
}) {
  const ids = useControlIds(id);
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      tone={tone}
      controlId={ids.controlId}
      errorId={ids.error}
      hintId={ids.hint}
      className={wrapperClassName}
    >
      <select
        id={ids.controlId}
        required={required}
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
  id,
  required,
  ...rest
}: WithFieldProps<TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  const ids = useControlIds(id);
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      tone={tone}
      controlId={ids.controlId}
      errorId={ids.error}
      hintId={ids.hint}
      className={wrapperClassName}
    >
      <textarea
        id={ids.controlId}
        required={required}
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
  id,
  required,
  ...rest
}: WithFieldProps<Omit<InputHTMLAttributes<HTMLInputElement>, "type">>) {
  const ids = useControlIds(id);
  return (
    <div className={wrapperClassName}>
      <div className="flex items-start gap-3">
        <input
          id={ids.controlId}
          type="checkbox"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? ids.error : undefined}
          className={cn(
            "mt-0.5 size-4 shrink-0 cursor-pointer rounded border accent-emerald-brand",
            TONES[tone].checkbox,
            className,
          )}
          {...rest}
        />
        <label htmlFor={ids.controlId} className={cn("leading-relaxed", TONES[tone].checkboxLabel)}>
          {label}
          {required ? <RequiredMark tone={tone} /> : null}
        </label>
      </div>
      {error ? <FieldError id={ids.error} message={error} tone={tone} /> : null}
    </div>
  );
}
