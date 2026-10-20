import { adminAppUrl } from "./env";

/**
 * Absolute URL on the admin host, for redirects. Never built from `request.url` or
 * `nextUrl`: the standalone server behind Caddy only sees its bind address
 * (`HOSTNAME=0.0.0.0`, port 3001), not the public host.
 */
export function appUrl(path: string): URL {
  return new URL(path, adminAppUrl());
}
