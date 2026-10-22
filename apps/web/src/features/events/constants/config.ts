export const EVENTS_PATH = "/chuong-trinh";
export const SCHOOL_PATH = "/chuong-trinh/truong-hoc";
export const HANDBOOK_PATH = "/cam-nang";
export const TICKET_LOOKUP_PATH = "/tra-cuu-ve";
export const SIGN_IN_PATH = "/dang-nhap";

export const eventPath = (slug: string) => `${EVENTS_PATH}/${slug}`;

/** `.ics` of one event (Route Handler next to the page). */
export const calendarPath = (slug: string) => `${EVENTS_PATH}/${slug}/lich`;

/**
 * Checkout of one event (feature `checkout`). The chosen ticket type and quantity only
 * pre-fill the checkout form: it validates them again, and so does program-service.
 */
export const checkoutPath = (slug: string, pick?: { ticketTypeId: string; quantity: number }) =>
  pick
    ? `${EVENTS_PATH}/${slug}/dang-ky?${new URLSearchParams({
        ve: pick.ticketTypeId,
        sl: String(pick.quantity),
      }).toString()}`
    : `${EVENTS_PATH}/${slug}/dang-ky`;

/** Fallback lifetime of cached event data; publishing revalidates the tags at once. */
export const EVENTS_CACHE_SECONDS = 300;

/** One page of the program calendar; months are grouped from it. */
export const UPCOMING_PAGE_SIZE = 24;
export const PAST_PAGE_SIZE = 6;
export const RELATED_COUNT = 3;
/** Months offered by the "Thời gian" filter after this one and the next. */
export const MONTH_OPTIONS = 6;

/** The banner block shows the soonest event people can still book. */
export const FEATURED_STATES = ["open", "few_left"] as const;

/** Sections of the event page, in order: anchor ids of the sticky tabs. */
export const DETAIL_SECTIONS = [
  "overview",
  "schedule",
  "benefits",
  "instructors",
  "safety",
  "policy",
  "faq",
  "map",
] as const;
export type DetailSection = (typeof DETAIL_SECTIONS)[number];

export const SECTION_ANCHORS: Record<DetailSection, string> = {
  overview: "tong-quan",
  schedule: "lich-trinh",
  benefits: "ban-se-nhan",
  instructors: "nguoi-huong-dan",
  safety: "luu-y",
  policy: "chinh-sach",
  faq: "hoi-dap",
  map: "ban-do",
};
