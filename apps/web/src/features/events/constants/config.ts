export const EVENTS_PATH = "/chuong-trinh";
export const SCHOOL_PATH = "/chuong-trinh/truong-hoc";
export const HANDBOOK_PATH = "/cam-nang";
export const TICKET_LOOKUP_PATH = "/tra-cuu-ve";

/** Checkout of one event (feature `checkout`). */
export const checkoutPath = (slug: string) => `${EVENTS_PATH}/${slug}/dang-ky`;

/** Fallback lifetime of cached event data; publishing revalidates the tags at once. */
export const EVENTS_CACHE_SECONDS = 300;

export const UPCOMING_PAGE_SIZE = 12;
export const PAST_PAGE_SIZE = 6;
