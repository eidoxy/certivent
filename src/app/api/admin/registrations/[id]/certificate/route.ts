import { requireAdmin } from "@/lib/authz";
import { CERT_MAX_BYTES, CERT_MIME_TYPES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { removeObject, uploadObject } from "@/lib/storage";

type CertMime = (typeof CERT_MIME_TYPES)[number];

const EXTENSIONS: Record<CertMime, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

// Leading bytes that identify each allowed type.
const SIGNATURES: Record<CertMime, number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

const isCertMime = (type: string): type is CertMime =>
  (CERT_MIME_TYPES as readonly string[]).includes(type);

const matchesSignature = (bytes: Uint8Array, type: CertMime) =>
  SIGNATURES[type].every((byte, i) => bytes[i] === byte);

// Issue or replace the certificate of an ATTENDED registration (admin only).
export const POST = route(
  async (req: Request, ctx: RouteContext<"/api/admin/registrations/[id]/certificate">) => {
    const admin = await requireAdmin();
    const { id: registrationId } = await ctx.params;

    // 1. Load the registration with its current certificate.
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { certificate: true },
    });
    if (!registration) throw new HttpError(404, "NOT_FOUND", "Registration not found");

    // 2. Only attended participants get certificates.
    if (registration.status !== "ATTENDED") {
      throw new HttpError(409, "NOT_ATTENDED", "Certificates can only be issued to attended participants");
    }

    // 3. Read the multipart body. A body that cannot be parsed is the same as a missing file.
    let file: FormDataEntryValue | null;
    try {
      file = (await req.formData()).get("file");
    } catch {
      file = null;
    }
    if (!(file instanceof File)) {
      throw new HttpError(400, "INVALID_FILE", "Choose a file to upload");
    }

    // 4. Size limits.
    if (file.size === 0 || file.size > CERT_MAX_BYTES) {
      throw new HttpError(400, "INVALID_FILE", "File must be between 1 byte and 4 MB");
    }

    // 5. Declared MIME type allowlist.
    const type = file.type;
    if (!isCertMime(type)) {
      throw new HttpError(400, "INVALID_FILE", "Only PDF, PNG or JPEG files are allowed");
    }

    // 6. The content must match the declared type.
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesSignature(bytes, type)) {
      throw new HttpError(400, "INVALID_FILE", "File content does not match its type");
    }

    // 7. Object key.
    const ext = EXTENSIONS[type];
    const key = `${registration.eventId}/${registration.id}/${crypto.randomUUID()}.${ext}`;

    // 8. Display name: no path separators, quotes or line breaks.
    const fileName = file.name.replace(/[\\/\r\n"]/g, "_").slice(0, 200) || `certificate.${ext}`;

    // 9. Upload first, so the database never points at a missing object.
    await uploadObject(key, bytes, type);

    // 10. Create or replace the row. If this fails, the new object is orphaned: remove it.
    let certificate;
    try {
      certificate = await prisma.certificate.upsert({
        where: { registrationId: registration.id },
        create: {
          registrationId: registration.id,
          storageKey: key,
          fileName,
          mimeType: type,
          sizeBytes: file.size,
          uploadedById: admin.id,
        },
        update: {
          storageKey: key,
          fileName,
          mimeType: type,
          sizeBytes: file.size,
          uploadedById: admin.id,
          issuedAt: new Date(),
        },
      });
    } catch (err) {
      await removeObject(key);
      throw err;
    }

    // 11. The replaced object is garbage now (after the database update).
    if (registration.certificate) {
      await removeObject(registration.certificate.storageKey);
    }

    // 12. Respond.
    return ok(
      {
        id: certificate.id,
        fileName: certificate.fileName,
        mimeType: certificate.mimeType,
        sizeBytes: certificate.sizeBytes,
        issuedAt: certificate.issuedAt.toISOString(),
      },
      201,
    );
  },
);

// Remove the certificate of a registration (admin only).
export const DELETE = route(
  async (_req: Request, ctx: RouteContext<"/api/admin/registrations/[id]/certificate">) => {
    await requireAdmin();
    const { id } = await ctx.params;

    const certificate = await prisma.certificate.findUnique({ where: { registrationId: id } });
    if (!certificate) throw new HttpError(404, "NOT_FOUND", "Certificate not found");

    await prisma.certificate.delete({ where: { id: certificate.id } });
    await removeObject(certificate.storageKey);

    return ok({ id: certificate.id });
  },
);
