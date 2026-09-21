/** Interest options of the organization form (docs/03 §6.1 `interest.programKey`). */
export const INTEREST_VALUES = ["ngoai-khoa", "workshop", "esg", "combo"] as const;

/** Loosely accepts VN numbers with spaces, dots or dashes; real normalization is server-side. */
export const PHONE_PATTERN = /^\+?[0-9][0-9\s.-]{7,17}$/;
