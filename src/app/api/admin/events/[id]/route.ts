import { z } from "zod";
import { eventToInput, inputToEventData, toAdminEvent } from "@/lib/admin-events";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { HttpError, ok, parseJson, route } from "@/lib/http";
import { activeCountInclude } from "@/lib/serializers";
import { eventInputSchema, eventUpdateSchema } from "@/lib/validations/event";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/admin/events/[id]">) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const event = await prisma.event.findUnique({ where: { id }, include: activeCountInclude });
  if (!event) throw new HttpError(404, "NOT_FOUND", "Event not found");

  return ok(toAdminEvent(event, event._count.registrations));
});

export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/admin/events/[id]">) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const patch = await parseJson(req, eventUpdateSchema);

  const existing = await prisma.event.findUnique({ where: { id }, include: activeCountInclude });
  if (!existing) throw new HttpError(404, "NOT_FOUND", "Event not found");

  // Merge the patch over the stored event, then validate the whole thing (cross-field rules included).
  const merged = eventInputSchema.safeParse({ ...eventToInput(existing), ...patch });
  if (!merged.success) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      z.flattenError(merged.error).fieldErrors as Record<string, string[]>,
    );
  }
  const input = merged.data;

  const activeCount = existing._count.registrations;
  if (input.capacity !== null && input.capacity < activeCount) {
    const message = `Capacity cannot be lower than the ${activeCount} active ${
      activeCount === 1 ? "registration" : "registrations"
    }`;
    throw new HttpError(409, "CAPACITY_BELOW_ACTIVE", message, { capacity: [message] });
  }

  const updated = await prisma.event.update({
    where: { id },
    data: inputToEventData(input),
    include: activeCountInclude,
  });
  return ok(toAdminEvent(updated, updated._count.registrations));
});
