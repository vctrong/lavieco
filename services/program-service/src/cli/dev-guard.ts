const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Why a dev-only command must NOT run against this environment, or `null` when it may:
 * NODE_ENV must be `development` and every MongoDB host must be this machine. Atlas
 * (`mongodb+srv://`, `*.mongodb.net`) and any remote host are refused, so the seed can
 * never write default accounts into a shared or production database. The URI itself is
 * never part of the message (it may hold a password).
 */
export function devDatabaseIssue(env: { NODE_ENV?: string; MONGODB_URI?: string }): string | null {
  if (env.NODE_ENV !== "development") return "NODE_ENV is not development";
  const uri = env.MONGODB_URI ?? "";
  if (!uri.startsWith("mongodb://")) return "MONGODB_URI is not a local mongodb:// URI";
  // mongodb://[user:pass@]host1[:port][,host2...]/[db][?options]
  const authority = uri.slice("mongodb://".length).split(/[/?]/)[0] ?? "";
  const hosts = (authority.split("@").pop() ?? "").split(",").filter(Boolean);
  if (hosts.length === 0) return "MONGODB_URI has no host";
  for (const entry of hosts) {
    const host = entry.startsWith("[")
      ? entry.slice(0, entry.indexOf("]") + 1)
      : entry.split(":")[0];
    if (!LOCAL_HOSTS.has((host ?? "").toLowerCase()))
      return "MONGODB_URI points outside this machine";
  }
  return null;
}
