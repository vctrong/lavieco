import type { Role } from "@lavieco/shared/permissions";

/**
 * DEVELOPMENT-ONLY accounts written by `npm run dev:seed` into the LOCAL MongoDB
 * (docs/dev-local.md). Exception to "no default accounts in seeds" (CLAUDE §11): the
 * seed refuses any database that is not on this machine (`dev-guard.ts`), and the
 * `.test` domain can never receive mail. These values are public on purpose: never
 * reuse them anywhere else.
 */
export type DevStaffAccount = {
  email: string;
  displayName: string;
  roles: Role[];
  password: string;
  /** Fixed base32 TOTP secret so `npm run dev:totp` can print the current code. */
  totpSecret: string;
};

export type DevMemberAccount = {
  email: string;
  displayName: string;
  password: string;
};

export const DEV_STAFF: readonly DevStaffAccount[] = [
  {
    email: "superadmin@lavieco.test",
    displayName: "Dev Super Admin",
    roles: ["super_admin"],
    password: "LvDev!Super26",
    totpSecret: "LAVIECODEVSUPERADMINSECRETAAAAAA",
  },
  {
    email: "coordinator@lavieco.test",
    displayName: "Dev Điều phối",
    roles: ["coordinator"],
    password: "LvDev!Coord26",
    totpSecret: "LAVIECODEVCOORDINATORSECRETBBBBB",
  },
];

export const DEV_MEMBERS: readonly DevMemberAccount[] = [
  { email: "an@lavieco.test", displayName: "Nguyễn Văn An", password: "LvDev!Member26" },
  { email: "binh@lavieco.test", displayName: "Trần Thị Bình", password: "LvDev!Member26" },
];

/** Consent version recorded on seeded members (BR-06): marks them as seed data. */
export const DEV_CONSENT_VERSION = "dev-seed";
