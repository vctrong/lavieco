import { useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "../lib/cn";

const CONTROL_CLASS =
  "w-full border border-hairline-light bg-soft-white/10 px-4 text-xs text-soft-white transition-colors placeholder:text-soft-white/30 focus:border-emerald-brand focus:outline-none aria-[invalid=true]:border-canary";

type FieldShellProps = {
  label: string;
  error?: string;
  controlId: string;
  errorId: string;
  children: ReactNode;
  className?: string;
};

function FieldShell({ label, error, controlId, errorId, children, className }: FieldShellProps) {
  return (
    <div className={className}>
      <label
        htmlFor={controlId}
        className="mb-1.5 block text-[11px] font-medium uppercase tracking-museum text-mint-mist/70"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-[11px] text-canary">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type WithFieldProps<T> = T & { label: string; error?: string; wrapperClassName?: string };

/** Text input styled for dark ("Deep Sea") surfaces. */
export function TextField({
  label,
  error,
  wrapperClassName,
  className,
  ...rest
}: WithFieldProps<InputHTMLAttributes<HTMLInputElement>>) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <FieldShell
      label={label}
      error={error}
      controlId={id}
      errorId={errorId}
      className={wrapperClassName}
    >
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(CONTROL_CLASS, "rounded-full py-2.5", className)}
        {...rest}
      />
    </FieldShell>
  );
}

type SelectOption = { value: string; label: string };

/** Select styled for dark surfaces. */
export function SelectField({
  label,
  error,
  wrapperClassName,
  className,
  options,
  ...rest
}: WithFieldProps<SelectHTMLAttributes<HTMLSelectElement>> & {
  options: readonly SelectOption[];
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <FieldShell
      label={label}
      error={error}
      controlId={id}
      errorId={errorId}
      className={wrapperClassName}
    >
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(CONTROL_CLASS, "rounded-full bg-deep-blue py-2.5", className)}
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

/** Textarea styled for dark surfaces. */
export function TextareaField({
  label,
  error,
  wrapperClassName,
  className,
  ...rest
}: WithFieldProps<TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <FieldShell
      label={label}
      error={error}
      controlId={id}
      errorId={errorId}
      className={wrapperClassName}
    >
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(CONTROL_CLASS, "resize-none rounded-2xl py-2", className)}
        {...rest}
      />
    </FieldShell>
  );
}

/** Checkbox with an inline label (used for the data-processing consent). */
export function CheckboxField({
  label,
  error,
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
            "mt-0.5 size-4 shrink-0 cursor-pointer rounded border border-hairline-light bg-soft-white/10 accent-emerald-brand",
            className,
          )}
          {...rest}
        />
        <label htmlFor={id} className="text-[11.5px] leading-relaxed text-mint-mist/80">
          {label}
        </label>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-[11px] text-canary">
          {error}
        </p>
      ) : null}
    </div>
  );
}
