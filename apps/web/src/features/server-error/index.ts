import { TEXT } from "./constants/text";

export { ServerErrorView } from "./components/server-error-view";

/** `global-error` cannot export `metadata`, so it renders this in a `<title>` element. */
export const serverErrorTitle = TEXT.vi.metaTitle;
