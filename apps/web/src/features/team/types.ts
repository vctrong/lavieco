export const BACKDROPS = ["network", "particles", "palette", "stairs", "story", "keyhole"] as const;

export type Backdrop = (typeof BACKDROPS)[number];

export type TeamImage = { src: string; width: number; height: number };

export const CONTACT_CHANNELS = [
  "facebook",
  "zalo",
  "email",
  "github",
  "linkedin",
  "behance",
] as const;

export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

/** Channel → full URL (`mailto:` for email). Only channels the person has. */
export type TeamContacts = Partial<Record<ContactChannel, string>>;

export type TeamSkill = {
  label: string;
  /** Highlights the matching achievement when the chip is hovered. */
  achievementId?: string;
};

export type TeamAchievement = { id: string; text: string };

/** A handwritten margin note. `side` picks which corner of the portrait it sits in. */
export type TeamNote = { text: string; side: "left" | "right" };

export type TeamMember = {
  slug: string;
  /** Catalogue number, e.g. "01" (shown as "Nº 01"). */
  no: string;
  /** Full name, one entry per line in the profile heading (so no single word is left alone). */
  nameLines: readonly [string] | readonly [string, string];
  roleShort: string;
  roleFull: string;
  /** One-line summary shown on the grid card. */
  summary: string;
  quote: string;
  /** Substring of `quote` that gets the Canary underline. */
  quoteHighlight: string;
  bio: string;
  story: string;
  education?: { school: string; major: string; cohort: string };
  hometown?: string;
  location?: string;
  skills?: readonly TeamSkill[];
  achievements?: readonly TeamAchievement[];
  /** At most two. */
  notes?: readonly TeamNote[];
  contacts?: TeamContacts;
  /** Borderless cutout (alpha) shown on the grid arch. */
  photo: TeamImage;
  /** White-outlined cutout (alpha) shown in the open profile only. */
  sticker: TeamImage;
  /** Which illustrated backdrop sits behind the cutout on the grid card. */
  backdrop: Backdrop;
  /** Multiplies the cutout height on the card (1 = default overhang). Evens out framing. */
  photoScale?: number;
  /** Shifts the cutout down by this percent of its own height. Evens out framing. */
  photoOffsetY?: number;
  /** True while the profile still holds placeholder content. */
  draft: boolean;
};
