// Server only: never import from a "use client" file.
import type { Event, Prisma } from "@/generated/prisma/client";
import type { EventSummary } from "@/lib/api-client";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { registrationState } from "@/lib/registration-rules";

/** Prisma include that yields the active registration count as `event._count.registrations` (01 sec 5). */
export const activeCountInclude = {
  _count: {
    select: { registrations: { where: { status: { in: ACTIVE_STATUSES } } } },
  },
} satisfies Prisma.EventInclude;

type EventSummaryRow = Pick<
  Event,
  | "id"
  | "title"
  | "location"
  | "startsAt"
  | "endsAt"
  | "capacity"
  | "registrationDeadline"
  | "isPublished"
>;

/** Maps an Event row plus its active registration count to the public EventSummary shape. */
export function toEventSummary(event: EventSummaryRow, activeCount: number): EventSummary {
  const { isFull, isOpen, closedReason } = registrationState(event, activeCount);
  return {
    id: event.id,
    title: event.title,
    location: event.location,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    capacity: event.capacity,
    registrationDeadline: event.registrationDeadline?.toISOString() ?? null,
    activeCount,
    isFull,
    isOpen,
    closedReason,
  };
}
