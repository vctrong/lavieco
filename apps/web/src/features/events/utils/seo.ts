import type { PublicEventDetail } from "@lavieco/shared/events";
import { mediaDeliveryUrl } from "@lavieco/shared/media";

import type { JsonLdObject } from "@/shared/components/json-ld";

/** Width of the share image: one of the allowed named transformations (ADR-0020). */
const SHARE_IMAGE_WIDTH = 1280;

/** The banner (else the poster) as an absolute URL for Open Graph and JSON-LD. */
export function shareImageOf(
  event: Pick<PublicEventDetail, "banner" | "cover">,
  cloudName: string,
): { url: string; width: number; height: number; alt: string } | null {
  const image = event.banner ?? event.cover;
  if (!image || !cloudName) return null;
  const width = Math.min(SHARE_IMAGE_WIDTH, image.width);
  return {
    url: mediaDeliveryUrl({ cloudName, publicId: image.publicId, width: SHARE_IMAGE_WIDTH }),
    width,
    height: Math.round((image.height / image.width) * width),
    alt: image.alt,
  };
}

const EVENT_STATUS = {
  cancelled: "https://schema.org/EventCancelled",
  scheduled: "https://schema.org/EventScheduled",
} as const;

/**
 * schema.org `Event` of a public event page. Public data only: never the online link
 * (an online event gets a VirtualLocation pointing at its own page).
 */
export function eventJsonLd(
  event: PublicEventDetail,
  options: { pageUrl: string; organizer: string; siteUrl: string; imageUrl: string | null },
): JsonLdObject {
  const online = event.format === "online";
  const offers = event.ticketTypes.map((ticket) => ({
    "@type": "Offer",
    name: ticket.name,
    price: ticket.price,
    priceCurrency: "VND",
    url: options.pageUrl,
    availability: ticket.availability.soldOut
      ? "https://schema.org/SoldOut"
      : "https://schema.org/InStock",
  }));
  const data: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary || event.description.slice(0, 300),
    startDate: event.startAt,
    endDate: event.endAt,
    eventStatus: event.status === "cancelled" ? EVENT_STATUS.cancelled : EVENT_STATUS.scheduled,
    eventAttendanceMode: online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: online
      ? { "@type": "VirtualLocation", url: options.pageUrl }
      : {
          "@type": "Place",
          name: event.venue?.name ?? "",
          address: event.venue?.address ?? "",
        },
    organizer: { "@type": "Organization", name: options.organizer, url: options.siteUrl },
    url: options.pageUrl,
  };
  if (options.imageUrl) data.image = [options.imageUrl];
  if (offers.length > 0) data.offers = offers;
  return data;
}
