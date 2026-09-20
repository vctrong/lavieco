export type TeamMember = {
  id: string;
  /** Catalogue number shown on the placard, e.g. "Nº 01". */
  number: string;
  name: string;
  /** Short role chip. */
  shortRole: string;
  /** Full title. */
  title: string;
  bio: string;
  photo: { src: string; width: number; height: number };
};
