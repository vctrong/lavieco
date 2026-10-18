const HIDDEN = "***";

/**
 * Booker's email for the order-link pages, which anyone holding the link can open:
 * keeps the first two characters of the local part (one when it is that short) and the
 * domain, e.g. `tr***@gmail.com`. Anything that is not an address becomes `***`.
 * Never returns the input unchanged.
 */
export function maskEmail(email: string): string {
  const value = email.trim();
  const at = value.lastIndexOf("@");
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (at <= 0 || !domain.includes(".") || /\s/.test(value)) return HIDDEN;
  const masked = `${local.slice(0, local.length <= 2 ? 1 : 2)}${HIDDEN}@${domain}`;
  return masked === value ? HIDDEN : masked;
}

/**
 * Booker's phone, last three digits only (`***789`), whatever the input format
 * (`+84 336.922.235`). Fewer than four digits gives `***`. Never returns the input.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return HIDDEN;
  const masked = `${HIDDEN}${digits.slice(-3)}`;
  return masked === phone.trim() ? HIDDEN : masked;
}
