/**
 * What an individual visitor wants to take home.
 * TODO(DQ): confirm these options and the gift_requests mapping (docs/03 §6.3) with the team.
 */
export const INTEREST_VALUES = ["gift", "workshop", "handbook-updates"] as const;

/** Loosely accepts VN numbers with spaces, dots or dashes; real normalization is server-side. */
export const PHONE_PATTERN = /^\+?[0-9][0-9\s.-]{7,17}$/;
