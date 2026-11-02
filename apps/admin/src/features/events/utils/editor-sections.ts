import type { EventView, PublishBlocker, PublishWarning } from "@lavieco/shared/events";

export type EditorNavKey = "basics" | "images" | "time" | "tickets" | "form";
export type EditorNavStatus = "ok" | "attention";
export type EditorNavItem = { key: EditorNavKey; anchor: string; status: EditorNavStatus };

const SECTION_OF_BLOCKER: Record<PublishBlocker, EditorNavKey> = {
  event_type_archived: "basics",
  start_in_past: "time",
  past_event_not_finished: "time",
  venue_missing: "time",
  ticket_type_missing: "tickets",
};
const SECTION_OF_WARNING: Record<PublishWarning, EditorNavKey> = {
  summary_missing: "basics",
  online_url_missing: "time",
};

const ANCHORS: Record<EditorNavKey, string> = {
  basics: "thong-tin",
  images: "hinh-anh",
  time: "thoi-gian",
  tickets: "loai-ve",
  form: "form-dang-ky",
};

/**
 * The editor's side menu with ✓/⚠ from `publish-readiness`. Only the service decides
 * what blocks publishing; a missing poster is the one extra hint, since the website
 * falls back to an illustration and nothing would otherwise point at it.
 */
export function editorNavItems(
  event: Pick<EventView, "kind" | "readiness" | "cover">,
): EditorNavItem[] {
  const attention = new Set<EditorNavKey>([
    ...event.readiness.blockers.map((blocker) => SECTION_OF_BLOCKER[blocker]),
    ...event.readiness.warnings.map((warning) => SECTION_OF_WARNING[warning]),
  ]);
  if (!event.cover) attention.add("images");
  const keys: EditorNavKey[] =
    event.kind === "past"
      ? ["basics", "images", "time"]
      : ["basics", "images", "time", "tickets", "form"];
  return keys.map((key) => ({
    key,
    anchor: ANCHORS[key],
    status: attention.has(key) ? "attention" : "ok",
  }));
}
