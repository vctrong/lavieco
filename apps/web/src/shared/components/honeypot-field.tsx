/**
 * Field humans never see or fill; bots that fill it are ignored server-side. Browsers
 * ignore `autocomplete="off"` and password managers fill any visible-to-them `website`
 * box, which silently turned real bookings into "bot" ones: the extra attributes ask
 * Chrome, 1Password, LastPass, Bitwarden and Dashlane to leave it alone.
 */
export function HoneypotField() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
      <input
        type="text"
        name="website"
        tabIndex={-1}
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
