/**
 * Field humans never see or fill; bots that fill it are ignored server-side. Chrome
 * autofill ignores `autocomplete="off"` and once put the buyer's email in this box,
 * which silently turned a real booking into a "bot" one (no OTP sent). Autofill and
 * password managers skip read-only fields; scripts posting the form still fill it. The
 * data attributes are the password managers' own ignore hints.
 */
export function HoneypotField() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        readOnly
        autoComplete="off"
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
        data-form-type="other"
        defaultValue=""
      />
    </div>
  );
}
