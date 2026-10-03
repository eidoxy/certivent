import type { AdminEventRow } from "@/lib/api-client";
import { inputToEventData, toAdminEvent } from "@/lib/admin-events";
import { requireAdmin } from "@/lib/authz";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { ok, parseJson, route } from "@/lib/http";
import { eventInputSchema } from "@/lib/validations/event";

export const GET = route(async () => {
  await requireAdmin();

  // All events, drafts included. The API caps the list at 100 rows.
  const events = await prisma.event.findMany({ orderBy: { startsAt: "desc" }, take: 100 });

  const counts =
    events.length === 0
      ? []
      : await prisma.registration.groupBy({
          by: ["eventId", "status"],
          where: { eventId: { in: events.map((event) => event.id) } },
          _count: { _all: true },
        });

  const activeByEvent = new Map<string, number>();
  const pendingByEvent = new Map<string, number>();
  for (const { eventId, status, _count } of counts) {
    if (ACTIVE_STATUSES.includes(status)) {
      activeByEvent.set(eventId, (activeByEvent.get(eventId) ?? 0) + _count._all);
    }
    if (status === "PENDING") {
      pendingByEvent.set(eventId, (pendingByEvent.get(eventId) ?? 0) + _count._all);
    }
  }

  const rows: AdminEventRow[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    location: event.location,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    isPublished: event.isPublished,
    capacity: event.capacity,
    activeCount: activeByEvent.get(event.id) ?? 0,
    pendingCount: pendingByEvent.get(event.id) ?? 0,
  }));
  return ok(rows);
});

export const POST = route(async (req: Request) => {
  const admin = await requireAdmin();
  const input = await parseJson(req, eventInputSchema);

  const event = await prisma.event.create({
    data: { ...inputToEventData(input), createdById: admin.id },
  });
  return ok(toAdminEvent(event, 0), 201);
});
