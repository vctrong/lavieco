/**
 * Whether a nav `href` matches the current pathname.
 * "/" matches exactly; other routes match themselves and their sub-paths.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  const path = href.split("#")[0] ?? href;
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}
