import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/authz";
import { ACTIVE_STATUSES, ADMIN_TRANSITIONS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { HttpError, ok, parseJson, route } from "@/lib/http";
import { isActiveStatus } from "@/lib/registration-rules";
import { statusUpdateSchema } from "@/lib/validations/registration";

type StatusResult = { id: string; status: string; updatedAt: Date };

const toResponse = (r: StatusResult) => ({
  id: r.id,
  status: r.status,
  updatedAt: r.updatedAt.toISOString(),
});

// P2025: the guarded update matched no row because the status changed under us.
const isRecordNotFound = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";

// Change the status of one registration (admin only).
export const PATCH = route(
  async (req: Request, ctx: RouteContext<"/api/admin/registrations/[id]">) => {
    await requireAdmin();
    const { id } = await ctx.params;
    const { status: to } = await parseJson(req, statusUpdateSchema);

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // 1. Load the registration with its certificate id.
          const registration = await tx.registration.findUnique({
            where: { id },
            select: {
              id: true,
              eventId: true,
              status: true,
              updatedAt: true,
              certificate: { select: { id: true } },
            },
          });
          if (!registration) throw new HttpError(404, "NOT_FOUND", "Registration not found");
          const from = registration.status;

          // 2. Same status is a no-op.
          if (to === from) return registration;

          // 3. Only transitions in the table are allowed.
          if (!ADMIN_TRANSITIONS[from].includes(to)) {
            throw new HttpError(409, "INVALID_TRANSITION", `Cannot change status from ${from} to ${to}`);
          }

          // 4. An issued certificate pins the ATTENDED status.
          if (from === "ATTENDED" && registration.certificate) {
            throw new HttpError(
              409,
              "CERTIFICATE_EXISTS",
              "Remove the certificate before changing this status",
            );
          }

          // 5. Re-activating a registration consumes a seat: lock the event and recount.
          //    Deadlines do not apply to admins.
          if (!isActiveStatus(from) && isActiveStatus(to)) {
            await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${registration.eventId} FOR UPDATE`;
            const event = await tx.event.findUniqueOrThrow({
              where: { id: registration.eventId },
              select: { capacity: true },
            });
            const activeCount = await tx.registration.count({
              where: { eventId: registration.eventId, status: { in: ACTIVE_STATUSES } },
            });
            if (event.capacity !== null && activeCount >= event.capacity) {
              throw new HttpError(409, "EVENT_FULL", "This event is full");
            }
          }

          // 6. Update, guarded on the status read in step 1 so a concurrent change is not overwritten.
          return tx.registration.update({
            where: { id, status: from },
            data: { status: to },
            select: { id: true, status: true, updatedAt: true },
          });
        },
        { timeout: 10_000 },
      );

      return ok(toResponse(result));
    } catch (err) {
      if (isRecordNotFound(err)) {
        throw new HttpError(
          409,
          "INVALID_TRANSITION",
          "This registration was changed by someone else. Refresh and try again.",
        );
      }
      throw err;
    }
  },
);
