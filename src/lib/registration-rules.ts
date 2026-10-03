import { ACTIVE_STATUSES, type RegistrationStatus } from "./constants";

export type ClosedReason = "UNPUBLISHED" | "STARTED" | "DEADLINE_PASSED" | "FULL" | null;

export function isActiveStatus(s: RegistrationStatus): boolean {
  return ACTIVE_STATUSES.includes(s);
}

export function registrationState(
  event: {
    isPublished: boolean;
    startsAt: Date;
    registrationDeadline: Date | null;
    capacity: number | null;
  },
  activeCount: number,
  now: Date = new Date(),
): { isFull: boolean; isOpen: boolean; closedReason: ClosedReason } {
  const isFull = event.capacity !== null && activeCount >= event.capacity;

  let closedReason: ClosedReason;
  if (!event.isPublished) {
    closedReason = "UNPUBLISHED";
  } else if (now >= event.startsAt) {
    closedReason = "STARTED";
  } else if (event.registrationDeadline !== null && now >= event.registrationDeadline) {
    closedReason = "DEADLINE_PASSED";
  } else if (isFull) {
    closedReason = "FULL";
  } else {
    closedReason = null;
  }

  return { isFull, isOpen: closedReason === null, closedReason };
}
