import { Prisma } from "@/generated/prisma/client";
import { requireParticipant } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { registrationState } from "@/lib/registration-rules";
import { activeCountInclude } from "@/lib/serializers";

type RegistrationRow = {
  id: string;
  eventId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Public shape of a registration returned by both verbs (dates as ISO strings). */
function toRegistrationResponse(r: RegistrationRow) {
  return {
    id: r.id,
    eventId: r.eventId,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

// Register the current participant for an event (or reactivate a cancelled registration).
export const POST = route(async (_req: Request, ctx: RouteContext<"/api/events/[id]/register">) => {
  const user = await requireParticipant();
  const { id } = await ctx.params;

  try {
    const registration = await prisma.$transaction(
      async (tx) => {
        // 1. Lock the event row; concurrent registrations for the same event queue here.
        const locked = await tx.$queryRaw<
          { id: string }[]
        >`SELECT "id" FROM "Event" WHERE "id" = ${id} FOR UPDATE`;
        if (locked.length === 0) throw new HttpError(404, "NOT_FOUND", "Event not found");

        // 2. Load the event with its active registration count.
        const event = await tx.event.findUniqueOrThrow({ where: { id }, include: activeCountInclude });

        // 3. Existing registration for this user.
        const existing = await tx.registration.findUnique({
          where: { userId_eventId: { userId: user.id, eventId: id } },
        });
        if (existing && existing.status !== "CANCELLED") {
          throw new HttpError(409, "ALREADY_REGISTERED", "You already have a registration for this event");
        }

        // 4. Window and capacity.
        const state = registrationState(event, event._count.registrations);
        if (state.closedReason === "UNPUBLISHED") throw new HttpError(404, "NOT_FOUND", "Event not found");
        if (state.closedReason === "FULL") throw new HttpError(409, "EVENT_FULL", "This event is full");
        if (state.closedReason) {
          throw new HttpError(409, "REGISTRATION_CLOSED", "Registration for this event is closed");
        }

        // 5. Reactivate the cancelled row or create a new one.
        return existing
          ? tx.registration.update({ where: { id: existing.id }, data: { status: "PENDING" } })
          : tx.registration.create({ data: { userId: user.id, eventId: id } });
      },
      { timeout: 10_000 },
    );

    return ok(toRegistrationResponse(registration), 201);
  } catch (err) {
    // Double-click race on the (userId, eventId) unique index.
    if (isUniqueViolation(err)) {
      throw new HttpError(409, "ALREADY_REGISTERED", "You already have a registration for this event");
    }
    throw err;
  }
});

// Cancel the current participant's own registration.
export const DELETE = route(async (_req: Request, ctx: RouteContext<"/api/events/[id]/register">) => {
  const user = await requireParticipant();
  const { id } = await ctx.params;

  const registration = await prisma.registration.findUnique({
    where: { userId_eventId: { userId: user.id, eventId: id } },
    include: { event: { select: { startsAt: true } } },
  });
  if (!registration) throw new HttpError(404, "NOT_FOUND", "Registration not found");

  if (registration.status !== "PENDING" && registration.status !== "APPROVED") {
    throw new HttpError(409, "INVALID_TRANSITION", "This registration can no longer be cancelled");
  }
  if (new Date() >= registration.event.startsAt) {
    throw new HttpError(409, "REGISTRATION_CLOSED", "The event has already started");
  }

  const updated = await prisma.registration.update({
    where: { id: registration.id },
    data: { status: "CANCELLED" },
  });
  return ok(toRegistrationResponse(updated));
});
