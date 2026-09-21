/** How far along the launch is, 0–100. Purely a mood indicator, not a measured metric. */
export const LAUNCH_PROGRESS = 60;

/**
 * Version of the consent wording shown next to the email field; stored with the
 * consent timestamp so each sign-up is traceable to the text the visitor saw (BR-06).
 * Bump it whenever `TEXT.vi.form.consent` changes.
 */
export const WAITLIST_CONSENT_VERSION = "waitlist-2026-01";
