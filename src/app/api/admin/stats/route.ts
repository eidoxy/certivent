import type { AdminStats } from "@/lib/api-client";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { ok, route } from "@/lib/http";

export const GET = route(async () => {
  await requireAdmin();

  const now = new Date();
  const [totalEvents, publishedEvents, upcomingEvents, pendingRegistrations, awaitingCertificate] =
    await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { isPublished: true } }),
      prisma.event.count({ where: { startsAt: { gte: now } } }),
      prisma.registration.count({ where: { status: "PENDING" } }),
      prisma.registration.count({ where: { status: "ATTENDED", certificate: { is: null } } }),
    ]);

  const stats: AdminStats = {
    totalEvents,
    publishedEvents,
    upcomingEvents,
    pendingRegistrations,
    awaitingCertificate,
  };
  return ok(stats);
});
