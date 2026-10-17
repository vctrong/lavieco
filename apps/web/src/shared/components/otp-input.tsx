"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

import { cn } from "@lavieco/ui";

import { SITE_TEXT } from "../constants/text";

const OTP_LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * Six one-digit boxes: typing moves forward, Backspace moves back, pasting a whole
 * code fills every box. The first box carries `autocomplete="one-time-code"` so
 * phones can offer the code from the email.
 */
export function OtpInput({ value, onChange, disabled, invalid, describedBy }: OtpInputProps) {
  const t = SITE_TEXT.vi.otp;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? "");

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join("").slice(0, OTP_LENGTH));
  };

  const handleInput = (index: number, raw: string) => {
    const onlyDigits = raw.replace(/\D/g, "");
    if (onlyDigits.length > 1) {
      onChange(onlyDigits.slice(0, OTP_LENGTH));
      refs.current[Math.min(onlyDigits.length, OTP_LENGTH) - 1]?.focus();
      return;
    }
    setDigit(index, onlyDigits);
    if (onlyDigits && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      setDigit(index - 1, "");
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
  };

  return (
    <fieldset aria-describedby={describedBy} className="min-w-0">
      <legend className="sr-only">{t.groupLabel}</legend>
      <div className="flex gap-2 sm:gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={OTP_LENGTH}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={t.digitLabel(index + 1)}
            aria-invalid={invalid ? true : undefined}
            disabled={disabled}
            value={digit}
            onChange={(event) => handleInput(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.target.select()}
            className={cn(
              "aspect-square w-full min-w-0 max-w-14 rounded-2xl border border-hairline bg-white text-center font-display text-2xl text-deep-blue transition-colors",
              "focus:border-emerald-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-brand/40",
              "aria-[invalid=true]:border-canary disabled:opacity-60",
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}
