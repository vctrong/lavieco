import { logout } from "@/features/account";
import { Footer, MAIN_CONTENT_ID, Navbar, SkipLink, TideLine } from "@/features/navigation";

/** Chrome of the regular site: navigation, footer and the main landmark. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* Site chrome stays off paper (printed tickets). */}
      <div className="contents print:hidden">
        <SkipLink />
        <TideLine />
        <Navbar logoutAction={logout} />
      </div>
      <main id={MAIN_CONTENT_ID}>{children}</main>
      <div className="contents print:hidden">
        <Footer />
      </div>
    </>
  );
}
