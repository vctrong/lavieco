const SEPARATORS = /[\s.\-()]/g;
/** Vietnamese numbers in E.164: +84 then 9 digits (mobile) or 10 digits (landline). */
const VN_E164 = /^\+84[1-9]\d{8,9}$/;

/**
 * Matching key of a phone number (`phoneNormalized`, docs/03 §1.2): E.164, Vietnam by
 * default. Returns `null` when the input is not a plausible Vietnamese number. Only
 * the format is checked; there is no SMS verification (docs/05 §2).
 */
export function normalizePhone(phone: string): string | null {
  let digits = phone.trim().replace(SEPARATORS, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (digits.startsWith("+")) {
    // keep as is
  } else if (digits.startsWith("84") && digits.length >= 11) {
    digits = `+${digits}`;
  } else if (digits.startsWith("0")) {
    digits = `+84${digits.slice(1)}`;
  } else {
    return null;
  }
  return VN_E164.test(digits) ? digits : null;
}
