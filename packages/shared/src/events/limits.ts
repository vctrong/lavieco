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
  speakerBioMax: 600,
  benefitsMax: 8,
  benefitTextMax: 300,
  cancellationRulesMax: 10,
  agendaDescriptionMax: 500,
  minAgeMax: 99,
  cancelReasonMin: 10,
  cancelReasonMax: 500,
  /** Attendance of an archive-only event, typed by hand (published once approved, BR-09). */
  attendanceMax: 100_000,
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
  /**
   * "Sắp hết chỗ" (and "Còn X chỗ") when the seats left are at most this share of the
   * capacity OR at most `fewSeatsMin`, whichever allows more (public pages).
   */
  fewSeatsRatio: 0.2,
  fewSeatsMin: 5,
  previewTokenTtlMinutes: 10,
} as const;
