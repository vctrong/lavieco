import type { Metadata } from "next";

import { TEXT } from "./constants/text";

export { AccountPage } from "./components/account-page";

export const accountMetadata: Metadata = {
  title: TEXT.vi.metaTitle,
  robots: { index: false, follow: false },
};
