/**
 * Matching key of an email address (`emailNormalized`, docs/03 §1.2): trimmed and
 * lower-cased. The original value is kept separately for display. Provider-specific
 * tricks (dots, `+tag` in Gmail) are intentionally NOT removed: they are different
 * mailboxes as far as delivery is concerned.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
