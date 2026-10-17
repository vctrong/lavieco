/**
 * Caps on embedded arrays and text sizes of `lavieco_program` (docs/03 §1.1: every
 * embedded array has a cap). Shared so the admin forms enforce the same numbers.
 */
export const EVENT_LIMITS = {
  titleMax: 160,
  slugMax: 80,
  summaryMax: 400,
  descriptionMax: 10_000,
  safetyNotesMax: 3_000,
  cancellationPolicyMax: 3_000,
  speakersMax: 10,
  agendaMax: 30,
  faqMax: 20,
  questionsMax: 30,
  optionsMax: 20,
  ticketTypesMax: 10,
  maxPerOrderMax: 20,
  /** 100 million VND: anything above is a typo, not a workshop ticket. */
  priceMax: 100_000_000,
  quantityMax: 100_000,
  statusHistoryMax: 100,
  /** "Còn X chỗ" is only shown at or below this many seats (public pages). */
  fewSeatsThreshold: 10,
  previewTokenTtlMinutes: 10,
} as const;
