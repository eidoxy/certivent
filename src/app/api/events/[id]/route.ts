import type { EventDetail } from "@/lib/api-client";
import { getSessionUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { activeCountInclude, toEventSummary } from "@/lib/serializers";

// public
export const GET = route(async (_req: Request, ctx: RouteContext<"/api/events/[id]">) => {
  const { id } = await ctx.params;

  const event = await prisma.event.findUnique({ where: { id }, include: activeCountInclude });
  // Unpublished events are hidden from everyone, admins included (they use the admin API).
  if (!event || !event.isPublished) throw new HttpError(404, "NOT_FOUND", "Event not found");

  const user = await getSessionUser();
  const myRegistration =
    user?.role === "PARTICIPANT"
      ? await prisma.registration.findUnique({
          where: { userId_eventId: { userId: user.id, eventId: id } },
          select: { id: true, status: true },
        })
      : null;

  const detail: EventDetail = {
    ...toEventSummary(event, event._count.registrations),
    description: event.description,
    myRegistration,
  };
  return ok(detail);
});
