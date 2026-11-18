/**
 * Video hotspots play in a modal through the provider's embed player. Only YouTube
 * (served from youtube-nocookie.com) and TikTok are accepted, matching the
 * `frame-src` of the web CSP (ADR-0029). Pure parsing, no network.
 */
export type HandbookVideo = { provider: "youtube" | "tiktok"; id: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const TIKTOK_ID = /^\d{8,25}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
]);
const TIKTOK_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com"]);

function youtubeId(url: URL): string | null {
  if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0] ?? null;
  if (url.pathname === "/watch") return url.searchParams.get("v");
  const [, kind, id] = url.pathname.split("/");
  return kind === "shorts" || kind === "embed" || kind === "live" ? (id ?? null) : null;
}

function tiktokId(url: URL): string | null {
  // https://www.tiktok.com/@name/video/7234567890123456789 or /embed/v2/<id>
  const parts = url.pathname.split("/").filter(Boolean);
  const at = parts.indexOf("video");
  if (at >= 0) return parts[at + 1] ?? null;
  if (parts[0] === "embed") return parts[parts.length - 1] ?? null;
  return null;
}

/** The provider and id of a video link, or null when it is not an accepted one. */
export function parseHandbookVideoUrl(value: string): HandbookVideo | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) {
    const id = youtubeId(url);
    return id && YOUTUBE_ID.test(id) ? { provider: "youtube", id } : null;
  }
  if (TIKTOK_HOSTS.has(host)) {
    const id = tiktokId(url);
    return id && TIKTOK_ID.test(id) ? { provider: "tiktok", id } : null;
  }
  return null;
}

/** Embed player address; YouTube always through its privacy-enhanced domain. */
export function handbookVideoEmbedUrl(video: HandbookVideo): string {
  return video.provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1`
    : `https://www.tiktok.com/embed/v2/${video.id}`;
}
