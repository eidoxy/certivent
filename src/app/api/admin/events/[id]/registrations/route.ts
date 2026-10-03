import { z } from "zod";
import type { AdminRegistrationList } from "@/lib/api-client";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { activeCountInclude } from "@/lib/serializers";
import { registrationFilterSchema } from "@/lib/validations/registration";

// List the registrations of one event, optionally filtered by status (admin only).
export const GET = route(
  async (req: Request, ctx: RouteContext<"/api/admin/events/[id]/registrations">) => {
    await requireAdmin();
    const { id } = await ctx.params;

    // 1. Parse the filter; a missing param falls back to ALL.
    const parsed = registrationFilterSchema.safeParse({
      status: new URL(req.url).searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Validation failed",
        z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
      );
    }
    const { status } = parsed.data;

    // 2. The event with its active registration count.
    const event = await prisma.event.findUnique({ where: { id }, include: activeCountInclude });
    if (!event) throw new HttpError(404, "NOT_FOUND", "Event not found");

    // 3. The registrations, oldest first.
    const rows = await prisma.registration.findMany({
      where: { eventId: id, ...(status === "ALL" ? {} : { status }) },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
        certificate: {
          select: { id: true, fileName: true, mimeType: true, sizeBytes: true, issuedAt: true },
        },
      },
    });

    // 4. Response shape (dates as ISO strings).
    const body: AdminRegistrationList = {
      event: {
        id: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
        capacity: event.capacity,
        activeCount: event._count.registrations,
      },
      registrations: rows.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        user: r.user,
        certificate: r.certificate
          ? { ...r.certificate, issuedAt: r.certificate.issuedAt.toISOString() }
          : null,
      })),
    };
    return ok(body);
  },
);
