/** Route Handler that mints a preview token and redirects to `web` (D2). */
export const previewPath = (eventId: string) => `/events/${eventId}/preview`;

/** Query of the web preview: the event to come back to for a new token ("Làm mới"). */
export const PREVIEW_EVENT_PARAM = "su-kien";

/** Query of `/events` when a preview could not be opened. */
export const PREVIEW_ERROR_PARAM = "xem-truoc";
export const PREVIEW_ERROR_VALUE = "loi";
