// Server only: never import from a "use client" file.
import type { Event } from "@/generated/prisma/client";
import type { AdminEvent } from "@/lib/api-client";
import type { EventInput } from "@/lib/validations/event";

/** Maps an Event row plus its active registration count to the AdminEvent response shape (06 sec 2). */
export function toAdminEvent(event: Event, activeCount: number): AdminEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    capacity: event.capacity,
    registrationDeadline: event.registrationDeadline?.toISOString() ?? null,
    isPublished: event.isPublished,
    activeCount,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

/** The persisted fields of an Event, expressed as a validated EventInput (ISO date strings). */
export function eventToInput(event: Event): EventInput {
  return {
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    capacity: event.capacity,
    registrationDeadline: event.registrationDeadline?.toISOString() ?? null,
    isPublished: event.isPublished,
  };
}

/** EventInput (ISO date strings) to Prisma column values (Date objects). */
export function inputToEventData(input: EventInput) {
  return {
    title: input.title,
    description: input.description,
    location: input.location,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    capacity: input.capacity,
    registrationDeadline: input.registrationDeadline ? new Date(input.registrationDeadline) : null,
    isPublished: input.isPublished,
  };
}
