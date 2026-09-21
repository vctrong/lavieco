import { Footer, MAIN_CONTENT_ID, SkipLink, TideDock, TideLine } from "@/features/navigation";

/** Chrome of the regular site: navigation, footer and the main landmark. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SkipLink />
      <TideLine />
      <TideDock />
      <main id={MAIN_CONTENT_ID}>{children}</main>
      <Footer />
    </>
  );
}
