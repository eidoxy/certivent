import type { MyRegistration } from "@/lib/api-client";
import { requireParticipant } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { ok, route } from "@/lib/http";

// Every registration of the current participant (all statuses), newest event first.
export const GET = route(async () => {
  const user = await requireParticipant();

  const rows = await prisma.registration.findMany({
    where: { userId: user.id },
    orderBy: { event: { startsAt: "desc" } },
    select: {
      id: true,
      status: true,
      createdAt: true,
      event: { select: { id: true, title: true, location: true, startsAt: true, endsAt: true } },
      certificate: { select: { id: true, fileName: true, issuedAt: true } },
    },
  });

  const data: MyRegistration[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    event: {
      id: r.event.id,
      title: r.event.title,
      location: r.event.location,
      startsAt: r.event.startsAt.toISOString(),
      endsAt: r.event.endsAt.toISOString(),
    },
    certificate: r.certificate
      ? {
          id: r.certificate.id,
          fileName: r.certificate.fileName,
          issuedAt: r.certificate.issuedAt.toISOString(),
        }
      : null,
  }));

  return ok(data);
});
