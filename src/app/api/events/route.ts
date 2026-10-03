import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { activeCountInclude, toEventSummary } from "@/lib/serializers";

const querySchema = z.object({ q: z.string().trim().max(100).optional() });

// public
export const GET = route(async (req: Request) => {
  const parsed = querySchema.safeParse({
    q: new URL(req.url).searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    );
  }
  const { q } = parsed.data;

  const where: Prisma.EventWhereInput = {
    isPublished: true,
    endsAt: { gte: new Date() },
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const events = await prisma.event.findMany({
    where,
    orderBy: { startsAt: "asc" },
    take: 100,
    include: activeCountInclude,
  });

  return ok(events.map((event) => toEventSummary(event, event._count.registrations)));
});
