import type { Metadata } from "next";

import { TEXT } from "./constants/text";

export { AccountPage } from "./components/account-page";
export { handleAvatarRemoval, handleAvatarUpload } from "./server/avatar";

export const accountMetadata: Metadata = {
  title: TEXT.vi.metaTitle,
  robots: { index: false, follow: false },
};
