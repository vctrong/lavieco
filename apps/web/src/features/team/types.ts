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
  /** Regular-weight part of the name, e.g. "Võ Chí". */
  firstName: string;
  /** Italic part of the name, e.g. "Trọng". */
  lastName: string;
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
  /** Photo shown on the grid arch (and in the modal when there is no sticker). */
  photo: TeamImage;
  /** Optional die-cut PNG with a white outline baked in: public/images/team/{slug}-sticker.png. */
  sticker?: TeamImage;
  /** True while the profile still holds placeholder content. */
  draft: boolean;
};
