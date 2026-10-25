/** LaviAgent limits and routes (docs/07). Shared by the client checks and the route handlers. */

export const LAVIAGENT_HREF = "/laviagent";

/** `?hoi-thoai=<id>`: reopen a conversation (from history, or back from an idea page). */
export const CONVERSATION_PARAM = "hoi-thoai";
/** `?y-tuong=<id>`: start a conversation about an idea (idea page opened directly). */
export const IDEA_PARAM = "y-tuong";
/** `?vat-lieu=<material>`: start a conversation with that material's card. */
export const MATERIAL_PARAM = "vat-lieu";

export const conversationHref = (conversationId: string) =>
  `${LAVIAGENT_HREF}?${CONVERSATION_PARAM}=${encodeURIComponent(conversationId)}`;

/** An idea guide; from a conversation it carries the way back to it. */
export const ideaHref = (id: string, conversationId?: string | null) =>
  `/laviagent/y-tuong/${id}${
    conversationId ? `?${CONVERSATION_PARAM}=${encodeURIComponent(conversationId)}` : ""
  }`;

/** "Hỏi LaviAgent về ý tưởng này": back to its conversation, or a new one about the idea. */
export const askAboutIdeaHref = (ideaId: string, conversationId?: string | null) =>
  conversationId
    ? conversationHref(conversationId)
    : `${LAVIAGENT_HREF}?${IDEA_PARAM}=${encodeURIComponent(ideaId)}`;

export const ANALYZE_ENDPOINT = "/api/laviagent/analyze";
export const CHAT_ENDPOINT = "/api/laviagent/chat";

/** "Học trực tiếp tại workshop LAVIECO". */
export const WORKSHOP_HREF = "/chuong-trinh";

/** Before resizing: refuse obviously huge files early (a phone photo is 3–8 MB). */
export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
/** Long side after client resizing, then JPEG at RESIZE_QUALITY. */
export const RESIZE_MAX_SIDE = 1024;
export const RESIZE_QUALITY = 0.85;
/** What the server accepts after resizing (Caddy caps request bodies at 4 MB). */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/heic,image/heif";

/** The client gives up and offers samples / manual choice after this (the server too). */
export const ANALYZE_TIMEOUT_MS = 8_000;
/** Below this the result is shown as "unknown" (manual picker). */
export const MIN_CONFIDENCE = 0.55;

/** Only this many recent messages go to the model. */
export const CHAT_HISTORY_LIMIT = 10;
export const CHAT_MESSAGE_MAX_CHARS = 500;
/** Messages per anonymous session per day, and per IP per hour (in-memory, demo). */
export const CHAT_SESSION_LIMIT = 20;
export const CHAT_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;
export const CHAT_IP_LIMIT = 60;
export const CHAT_IP_WINDOW_MS = 60 * 60 * 1000;
export const ANALYZE_SESSION_LIMIT = 15;
export const ANALYZE_IP_LIMIT = 40;
export const ANALYZE_WINDOW_MS = 10 * 60 * 1000;
export const CHAT_TIMEOUT_MS = 30_000;

/** Pages where the floating button would cover a primary action (checkout, tickets). */
export const FAB_HIDDEN_PREFIXES: readonly string[] = [
  LAVIAGENT_HREF,
  "/chuong-trinh/thanh-toan",
  "/ve/",
  "/tra-cuu-ve",
  "/dang-nhap",
  "/dang-ky",
  "/quen-mat-khau",
];
/** `/chuong-trinh/<slug>/dang-ky` (booking form). */
export const FAB_HIDDEN_SUFFIXES: readonly string[] = ["/dang-ky"];
