import { eventCalendarResponse } from "@/features/events";

/** `GET /chuong-trinh/[slug]/lich`: "Thêm vào lịch" (.ics of the public event). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/chuong-trinh/[slug]/lich">,
) {
  const { slug } = await params;
  return eventCalendarResponse(slug);
}
