import type { Viewport } from "next";

import { logout } from "@/features/account";
import { MAIN_CONTENT_ID, Navbar, SkipLink } from "@/features/navigation";

/**
 * Chrome of full-screen tools (LaviAgent): a compact navbar, no footer, no floating
 * button. The page fills the screen (100dvh) and scrolls inside its own panels.
 */
export const viewport: Viewport = {
  // Android: the keyboard shrinks the layout, so the composer stays visible. iOS is
  // handled by the page itself (visualViewport).
  interactiveWidget: "resizes-content",
};

export default function AgentLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SkipLink />
      <Navbar logoutAction={logout} compact />
      <main id={MAIN_CONTENT_ID}>{children}</main>
    </>
  );
}
