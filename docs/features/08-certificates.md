# 08 — Certificates (upload, replace, remove, download)

Depends on: 00, 01, 02, 07. Stories: A-06, P-08. Business rule: PRD §6.6.

## 1. Storage design

- Supabase Storage, **private** bucket `certificates` (bucket settings: file size limit 4 MB; allowed MIME `application/pdf, image/png, image/jpeg`). Created once in the dashboard (module 09).
- Only the server talks to Storage, with the service-role key. The browser never receives a storage key or a long-lived URL.
- Object key: `{eventId}/{registrationId}/{randomUUID}.{ext}`; `ext` ∈ `pdf | png | jpg`.
- Download = authorization check, then a 60-second signed URL with `download: fileName`, returned as a 302.

## 2. `src/lib/env.ts` and `src/lib/storage.ts` (server only)

`env.ts`:

```ts
import { z } from "zod";
export const env = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_CERT_BUCKET: z.string().min(1).default("certificates"),
}).parse(process.env);
```

`storage.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = () => supabase.storage.from(env.SUPABASE_CERT_BUCKET);

export async function uploadObject(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const { error } = await bucket().upload(key, bytes, { contentType, upsert: false });
  if (error) throw error;
}
export async function removeObject(key: string): Promise<void> {
  const { error } = await bucket().remove([key]);
  if (error) console.error("storage.remove failed", key, error.message); // never throw
}
export async function createDownloadUrl(key: string, downloadName: string): Promise<string> {
  const { data, error } = await bucket().createSignedUrl(key, 60, { download: downloadName });
  if (error || !data) throw error ?? new Error("signed URL failed");
  return data.signedUrl;
}
```

## 3. API

### `POST /api/admin/registrations/:id/certificate` — `requireAdmin()`; body `multipart/form-data`, field `file`

1. Load registration `include: { certificate: true }`; missing → 404.
2. `status !== "ATTENDED"` → 409 `NOT_ATTENDED` "Certificates can only be issued to attended participants".
3. `const file = (await req.formData()).get("file")`; `!(file instanceof File)` → 400 `INVALID_FILE` "Choose a file to upload".
4. `file.size === 0 || file.size > CERT_MAX_BYTES` → 400 `INVALID_FILE` "File must be between 1 byte and 4 MB".
5. `file.type` not in `CERT_MIME_TYPES` → 400 `INVALID_FILE` "Only PDF, PNG or JPEG files are allowed".
6. `bytes = new Uint8Array(await file.arrayBuffer())`; check magic bytes match the declared type, else 400 `INVALID_FILE` "File content does not match its type":
   - PDF: `25 50 44 46` (`%PDF`)
   - PNG: `89 50 4E 47 0D 0A 1A 0A`
   - JPEG: `FF D8 FF`
7. `ext` from type (`pdf`/`png`/`jpg`); `key = \`${eventId}/${registrationId}/${crypto.randomUUID()}.${ext}\``.
8. `fileName = file.name.replace(/[\\/\r\n"]/g, "_").slice(0, 200) || \`certificate.${ext}\``.
9. `await uploadObject(key, bytes, file.type)`.
10. Then `prisma.certificate.upsert({ where: { registrationId }, create: { registrationId, storageKey: key, fileName, mimeType: file.type, sizeBytes: file.size, uploadedById: admin.id }, update: { storageKey: key, fileName, mimeType: file.type, sizeBytes: file.size, uploadedById: admin.id, issuedAt: new Date() } })`. If this throws → `await removeObject(key)` and rethrow.
11. If a previous certificate existed → `await removeObject(previous.storageKey)` (after the DB update).
12. Response 201 `{ data: { id, fileName, mimeType, sizeBytes, issuedAt } }`.

Vercel limits function request bodies to 4.5 MB; the 4 MB cap keeps multipart overhead under it.

### `DELETE /api/admin/registrations/:id/certificate` — `requireAdmin()`

`certificate.findUnique({ where: { registrationId: id } })`; none → 404. Delete the row, then `removeObject(storageKey)`. Response 200 `{ data: { id } }`.

### `GET /api/certificates/:id` — `requireUser()` (`:id` is the **certificate** id)

1. `certificate.findUnique({ where: { id }, include: { registration: { select: { userId: true } } } })`; missing → 404.
2. `user.role !== "ADMIN" && registration.userId !== user.id` → 403 `FORBIDDEN`.
3. `url = await createDownloadUrl(storageKey, fileName)`.
4. `return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } })`.

## 4. UI

### Participants table certificate cell (module 07), `ATTENDED` rows only
- No certificate → button "Upload certificate" opens `CertificateUploadDialog`.
- Has certificate → link "Download" (`<a href="/api/certificates/{certificate.id}">`), file name + size in muted text, button "Replace" (opens the dialog), button "Remove" (`AlertDialog` "Remove certificate for {name}?" → DELETE).

### `src/components/certificate-upload-dialog.tsx`
Props `{ eventId: string; registrationId: string; participantName: string; hasCertificate: boolean; open: boolean; onOpenChange(open: boolean): void }`.
- `Dialog` title "Upload certificate" / "Replace certificate", description "PDF, PNG or JPEG, max 4 MB. Issued to {participantName}."
- `<Label htmlFor="certificate-file">Certificate file</Label>` + `<Input id="certificate-file" type="file" accept="application/pdf,image/png,image/jpeg" />`. Use plain `useState<File | null>` (no react-hook-form).
- Client pre-check (size/type) with inline error text; server remains authoritative.
- Submit: `const fd = new FormData(); fd.append("file", file); apiFetch(\`/api/admin/registrations/${registrationId}/certificate\`, { method: "POST", body: fd })`. Success → toast "Certificate uploaded", close, invalidate `["admin", "event", eventId]` and `queryKeys.adminStats()`; error → show `error.message` inside the dialog.

### Participant side
Download button on `/my-events` (module 05).

## 5. Acceptance

- [ ] Upload for non-`ATTENDED` → 409; for `ATTENDED` → 201 and object exists under the expected key.
- [ ] `.exe` renamed to `.pdf` → 400 (magic bytes); 5 MB file → 400.
- [ ] Replace removes the old object; Remove deletes row and object.
- [ ] Owner downloads with original name; another participant → 403; guest → 401; signed URL expires after 60 s.
- [ ] Service-role key never appears in client bundles (`grep` the `.next/static` output for the key prefix).
