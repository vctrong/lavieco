import type { Metadata } from "next";

import { TEXT } from "./constants/text";

export { AcceptInvitePage, SecondFactorPage, StaffLoginPage } from "./components/auth-pages";
export { handleStaffRefresh } from "./server/refresh-session";

export const loginMetadata: Metadata = { title: TEXT.vi.meta.login };
export const secondFactorMetadata: Metadata = { title: TEXT.vi.meta.secondFactor };
export const inviteMetadata: Metadata = { title: TEXT.vi.meta.invite };
