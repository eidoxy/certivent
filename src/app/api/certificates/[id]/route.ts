import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { createDownloadUrl } from "@/lib/storage";

// Download a certificate (:id is the certificate id). Admins and the owning participant only.
// Responds with a 302 to a 60-second signed URL; the browser never sees a storage key.
export const GET = route(async (_req: Request, ctx: RouteContext<"/api/certificates/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: { registration: { select: { userId: true } } },
  });
  if (!certificate) throw new HttpError(404, "NOT_FOUND", "Certificate not found");

  if (user.role !== "ADMIN" && certificate.registration.userId !== user.id) {
    throw new HttpError(403, "FORBIDDEN", "You do not have access to this resource");
  }

  const url = await createDownloadUrl(certificate.storageKey, certificate.fileName);
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "no-store" },
  });
});
