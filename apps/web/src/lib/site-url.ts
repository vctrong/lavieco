import { publicEnv } from "./env.public";

/**
 * Absolute URL on the public site, for redirects. Never built from `request.url` or
 * `nextUrl`: the standalone server behind Caddy only sees its bind address
 * (`HOSTNAME=0.0.0.0`, port 3000), not the public host.
 */
export function siteUrl(path: string): URL {
  return new URL(path, publicEnv.siteUrl);
}
