import { EventsListSkeleton } from "@/features/events";

/** Only the list: the event pages and the checkout have their own loading states. */
export default function ProgramsLoading() {
  return <EventsListSkeleton />;
}
