import { MAIN_CONTENT_ID, SkipLink } from "@/features/navigation";

/**
 * Chrome of the handbook reader: none. The reader fills the screen with its own one-line
 * top bar and bottom bar; no site navbar, footer or floating LaviAgent button, so
 * nothing covers the page controls (ADR-0029).
 */
export default function ReaderLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SkipLink />
      <main id={MAIN_CONTENT_ID}>{children}</main>
    </>
  );
}
