import { TEXT } from "../constants/text";

export const MAIN_CONTENT_ID = "main";

/** First focusable element on every page: jumps past the navigation. */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="fixed left-4 top-4 z-[60] -translate-y-24 rounded-full bg-deep-blue px-5 py-2.5 text-sm font-semibold text-soft-white shadow-float-dock transition-transform duration-300 focus:translate-y-0"
    >
      {TEXT.vi.skipLink}
    </a>
  );
}
